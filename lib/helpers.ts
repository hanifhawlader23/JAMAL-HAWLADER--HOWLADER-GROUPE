export const generateId = () => {
  return Math.random().toString(36).slice(2, 11);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};


const nameColors = ['#ef4444', '#f97316', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'];

export const getColorForName = (name: string) => {
    let hash = 0;
    if (!name || name.length === 0) return nameColors[0];
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % nameColors.length);
    return nameColors[index];
};