import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DateKey } from '../../domain/models';
import { createSlots, DaySlot, recycleSlots, repointSlots } from './pagerRing';

export type { DaySlot } from './pagerRing';

/** Fraction of the viewport a drag must cover before it commits to the next day. */
const COMMIT_DISTANCE = 0.25;
/** Fling speed (px/s) that commits regardless of distance. */
const COMMIT_VELOCITY = 550;
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

export interface DayPagerState {
  slots: DaySlot[];
  /** Index into `slots` of the centred panel. */
  activeIndex: number;
  /** The centred date. Commits as soon as the finger lifts. */
  date: DateKey;
  /** The date of the panel filling most of the screen; differs from `date` mid-drag. */
  visibleDate: DateKey;
  /** Animates one day when `next` is adjacent, jumps otherwise. */
  goToDate: (next: DateKey) => void;
  pos: SharedValue<number>;
  viewport: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * Drives the horizontal day swipe.
 *
 * Three panels stay mounted so the neighbouring days are already on screen while the finger is
 * still down. They sit on a ring: `pos` is the fractional page currently centred, each panel is
 * drawn at `(page - pos) * width`, and the panel that ends up two pages away is recycled only
 * once a slide has settled — by then it is off screen, so its content never flashes into view.
 */
export function useDayPager(initialDate: DateKey): DayPagerState {
  const [slots, setSlots] = useState<DaySlot[]>(() => createSlots(initialDate));
  /** Committed page. */
  const [page, setPage] = useState(0);
  /** Page nearest the middle of the screen, which leads `page` while a drag is in flight. */
  const [visiblePage, setVisiblePage] = useState(0);

  const pos = useSharedValue(0);
  /** Middle page of the mounted ring; the drag is clamped to it so a panel is never missing. */
  const ringCentre = useSharedValue(0);
  const viewport = useSharedValue(Dimensions.get('window').width);
  const startPos = useSharedValue(0);
  const anchorX = useSharedValue(0);

  const activeIndex = Math.max(
    0,
    slots.findIndex((slot) => slot.page === page),
  );
  const date = slots[activeIndex].date;
  const visibleDate = slots.find((slot) => slot.page === visiblePage)?.date ?? date;

  /** Moves the ring on by one page. Runs only once a slide has finished, never mid-gesture. */
  const recycle = useCallback(
    (target: number) => {
      ringCentre.value = target;
      setPage(target);
      setSlots((prev) => recycleSlots(prev, target));
    },
    [ringCentre],
  );

  /** Slides to a mounted page. Clamped to the ring so the destination panel always exists. */
  const slideTo = useCallback(
    (target: number) => {
      'worklet';
      const page = Math.min(ringCentre.value + 1, Math.max(ringCentre.value - 1, target));
      pos.value = withTiming(page, SLIDE, (finished) => {
        if (finished) runOnJS(recycle)(page);
      });
      runOnJS(setPage)(page);
    },
    [pos, recycle, ringCentre],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-14, 14])
        .onStart((event) => {
          startPos.value = pos.value;
          // The gesture only activates after ~18px, so track the finger from there to avoid a jump.
          anchorX.value = event.translationX;
        })
        .onUpdate((event) => {
          const width = viewport.value;
          if (width <= 0) return;
          const next = startPos.value - (event.translationX - anchorX.value) / width;
          pos.value = Math.min(ringCentre.value + 1, Math.max(ringCentre.value - 1, next));
        })
        .onEnd((event) => {
          const width = viewport.value;
          const moved = event.translationX - anchorX.value;
          const base = Math.round(startPos.value);
          let target = base;
          // Distance decides first: a fling that contradicts a long drag must not win, or the
          // panel about to be recycled would still be on screen.
          if (moved <= -width * COMMIT_DISTANCE) target = base + 1;
          else if (moved >= width * COMMIT_DISTANCE) target = base - 1;
          else if (event.velocityX <= -COMMIT_VELOCITY) target = base + 1;
          else if (event.velocityX >= COMMIT_VELOCITY) target = base - 1;
          slideTo(target);
        }),
    [anchorX, pos, ringCentre, slideTo, startPos, viewport],
  );

  useAnimatedReaction(
    () => Math.round(pos.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setVisiblePage)(current);
    },
  );

  const goToDate = useCallback(
    (next: DateKey) => {
      if (next === date) return;
      // A neighbour is already mounted, so the arrows slide exactly like a swipe.
      const mounted = slots.find((slot) => slot.date === next);
      if (mounted && Math.abs(mounted.page - page) === 1 && page === visiblePage) {
        slideTo(mounted.page);
        return;
      }
      // Any other date is not mounted: keep the ring where it is and re-point every panel at it.
      setSlots((prev) => repointSlots(prev, page, next));
    },
    [date, page, slideTo, slots, visiblePage],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width > 0) viewport.value = width;
    },
    [viewport],
  );

  return { slots, activeIndex, date, visibleDate, goToDate, pos, viewport, gesture, onLayout };
}

interface ViewProps {
  pager: DayPagerState;
  children: (slot: DaySlot, index: number) => ReactNode;
}

export function DayPagerView({ pager, children }: ViewProps) {
  return (
    <GestureDetector gesture={pager.gesture}>
      <View style={styles.viewport} onLayout={pager.onLayout}>
        {pager.slots.map((slot, index) => (
          <Panel key={index} slot={slot} pos={pager.pos} viewport={pager.viewport} active={index === pager.activeIndex}>
            {children(slot, index)}
          </Panel>
        ))}
      </View>
    </GestureDetector>
  );
}

interface PanelProps {
  slot: DaySlot;
  pos: SharedValue<number>;
  viewport: SharedValue<number>;
  active: boolean;
  children: ReactNode;
}

function Panel({ slot, pos, viewport, active, children }: PanelProps) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (slot.page - pos.value) * viewport.value }] }), [slot.page]);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
});
