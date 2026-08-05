// Placeholder for date utility functions
// e.g., calculateRemainingDays, formatHumanReadableDate

export function calculateRemainingDays(endDate: string): number {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function getRemainingTime(endDate: string) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff < 0) {
    const daysOverdue = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
    return { isOverdue: true, days: daysOverdue === 0 ? 1 : daysOverdue, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  return { isOverdue: false, days, hours, minutes };
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInMonths / 12)}y ago`;
}
