import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DateKey } from '../domain/models';

export type DrawerParamList = {
  /** `date` opens the Day screen on that exact date, e.g. from a Statistics column. */
  Day: { date?: DateKey } | undefined;
  Statistics: undefined;
  Products: undefined;
  Recipes: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<DrawerParamList> | undefined;
  AddProduct: { date: DateKey };
  /** Omit the id to build a new recipe. */
  RecipeEditor: { recipeId?: number };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type DrawerRouteProps<T extends keyof DrawerParamList> = CompositeScreenProps<
  DrawerScreenProps<DrawerParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
