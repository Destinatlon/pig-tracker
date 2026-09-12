import { filterBySearch, matchesQuery, matchesTerms, searchTerms } from '../src/domain/search';

describe('search terms', () => {
  it('splits a query into lower-cased words', () => {
    expect(searchTerms('Protein Bar')).toEqual(['protein', 'bar']);
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(searchTerms('  protein   bar  ')).toEqual(['protein', 'bar']);
  });

  it('has no terms for an empty query', () => {
    expect(searchTerms('')).toEqual([]);
    expect(searchTerms('   ')).toEqual([]);
  });

  it('caps an absurdly long query', () => {
    expect(searchTerms('a b c d e f g h i j k')).toHaveLength(8);
  });
});

describe('matching a query against fields', () => {
  it('finds both word orders, from either word order', () => {
    for (const query of ['protein bar', 'bar protein', 'bar', 'protein']) {
      expect(matchesQuery(query, ['Protein bar'])).toBe(true);
      expect(matchesQuery(query, ['Bar protein'])).toBe(true);
    }
  });

  it('still matches when the words are not adjacent', () => {
    expect(matchesQuery('protein bar', ['Protein crisp bar'])).toBe(true);
  });

  it('narrows as more words are typed', () => {
    expect(matchesQuery('protein', ['Protein shake'])).toBe(true);
    expect(matchesQuery('protein bar', ['Protein shake'])).toBe(false);
  });

  it('matches inside a word, as a phrase search would', () => {
    expect(matchesQuery('bar', ['Rhubarb'])).toBe(true);
  });

  it('ignores case in Cyrillic, which SQLite LIKE would not', () => {
    // The word is capitalised in one name and lower-case in the other.
    expect(matchesQuery('капуста', ['Капуста білокачанна'])).toBe(true);
    expect(matchesQuery('капуста', ['Квашена капуста'])).toBe(true);
    expect(matchesQuery('КАПУСТА', ['Квашена капуста'])).toBe(true);
  });

  it('spreads the words across the fields it is given', () => {
    // "bar" is the product name, "chocolate" the variant name.
    expect(matchesQuery('bar chocolate', ['Protein bar', 'Chocolate'])).toBe(true);
  });

  it('skips absent fields instead of failing on them', () => {
    expect(matchesQuery('bar', ['Protein bar', null])).toBe(true);
    expect(matchesQuery('bar', [null, undefined])).toBe(false);
    expect(matchesQuery('', [null])).toBe(true);
  });

  it('matches everything when nothing was typed', () => {
    expect(matchesTerms([], ['anything'])).toBe(true);
  });
});

describe('filtering a list', () => {
  const items = [
    { name: 'Protein bar', variant: 'Chocolate' },
    { name: 'Bar protein', variant: '' },
    { name: 'Protein shake', variant: '' },
    { name: 'Квашена капуста', variant: '' },
    { name: 'Капуста білокачанна', variant: '' },
  ];
  const fields = (item: (typeof items)[number]) => [item.name, item.variant];

  it('keeps both word orders and drops what does not match', () => {
    expect(filterBySearch(items, 'protein bar', fields).map((item) => item.name)).toEqual(['Protein bar', 'Bar protein']);
  });

  it('finds every cabbage whichever way the name is capitalised', () => {
    expect(filterBySearch(items, 'капуста', fields)).toHaveLength(2);
  });

  it('returns everything, in order, for an empty query', () => {
    expect(filterBySearch(items, '  ', fields)).toEqual(items);
  });

  it('does not mutate the list it was given', () => {
    const copy = [...items];
    filterBySearch(items, 'protein', fields);
    expect(items).toEqual(copy);
  });
});
