// src/components/SkeletonLoader/PostCardSkeleton.tsx

import React from 'react';
import styles from './PostCardSkeleton.module.css';

// Type to define the required props for flexibility
interface PostCardSkeletonProps {
  count?: number; // How many skeletons to display
}

// Renders a single post skeleton element
const SkeletonElement = () => (
  <div className={`${styles.skeletonCard} ${styles.glassCardSkeleton}`}>
    <div className={styles.header}>
      {/* Mimic Avatar and Author */}
      <div className={styles.avatar}></div>
      <div className={styles.line} style={{ width: '40%' }}></div>
    </div>
    
    {/* Mimic Title */}
    <div className={styles.line} style={{ width: '80%', height: '1.2rem', marginTop: '1rem' }}></div>
    
    {/* Mimic Content Lines */}
    <div className={styles.line} style={{ width: '95%', marginTop: '0.8rem' }}></div>
    <div className={styles.line} style={{ width: '90%' }}></div>
    <div className={styles.line} style={{ width: '60%' }}></div>

    {/* Mimic Footer Actions */}
    <div className={styles.footer}>
      <div className={styles.iconPlaceholder}></div>
      <div className={styles.iconPlaceholder}></div>
    </div>
  </div>
);

/**
 * The main Skeleton Loader component for the Feed.
 * Renders a grid of skeleton cards.
 */
export const PostCardSkeleton: React.FC<PostCardSkeletonProps> = ({ count = 6 }) => {
  return (
    // Must match the postsGrid class in home.module.css
    <div className={styles.postsGrid}> 
      {Array(count).fill(0).map((_, index) => (
        <SkeletonElement key={index} />
      ))}
    </div>
  );
};

