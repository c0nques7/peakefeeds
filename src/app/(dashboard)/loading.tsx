import { PostCardSkeleton } from '@/components/SkeletonLoader/PostCardSkeleton';

// Shown while a feed, channel or profile page loads
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading">
      <PostCardSkeleton count={3} />
    </div>
  );
}
