export interface Suggestion {
  text: string;
  type: 'history' | 'bookmark' | 'trending';
}

const TRENDING_SEARCHES = [
  'Artificial Intelligence',
  'React Native',
  'Web Development',
  'Technology News',
  'Science',
  'Programming',
  'Design',
  'Business',
];

export const getSearchSuggestions = (
  query: string,
  history: any[],
  bookmarks: any[]
): Suggestion[] => {
  const suggestions: Suggestion[] = [];
  
  // Add history suggestions
  history
    .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .forEach(item => {
      suggestions.push({ text: item.title, type: 'history' });
    });
  
  // Add bookmark suggestions
  bookmarks
    .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .forEach(item => {
      suggestions.push({ text: item.title, type: 'bookmark' });
    });
  
  // Add trending suggestions
  if (query.length > 2) {
    TRENDING_SEARCHES
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .forEach(item => {
        suggestions.push({ text: item, type: 'trending' });
      });
  }
  
  return suggestions.slice(0, 5);
};