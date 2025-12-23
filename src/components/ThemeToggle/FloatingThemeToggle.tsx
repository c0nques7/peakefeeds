"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import clsx from 'clsx'

const BUTTON_SIZE = 48;
const PADDING = 8;

export default function FloatingThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: -100, y: -100 }) // Off-screen initially
  const [isDragging, setIsDragging] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const touchStartPos = useRef({ x: 0, y: 0 })
  const startButtonPos = useRef({ x: 0, y: 0 })

  const getNearestEdgePos = useCallback((x: number, y: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const distToLeft = x;
    const distToRight = windowWidth - (x + BUTTON_SIZE);
    const distToTop = y;
    const distToBottom = windowHeight - (y + BUTTON_SIZE);

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

    let finalX = x;
    let finalY = y;

    if (minDist === distToLeft) {
      finalX = PADDING;
    } else if (minDist === distToRight) {
      finalX = windowWidth - BUTTON_SIZE - PADDING;
    } else if (minDist === distToTop) {
      finalY = PADDING;
    } else {
      finalY = windowHeight - BUTTON_SIZE - PADDING;
    }

    // Keep within bounds
    finalX = Math.max(PADDING, Math.min(finalX, windowWidth - BUTTON_SIZE - PADDING));
    finalY = Math.max(PADDING, Math.min(finalY, windowHeight - BUTTON_SIZE - PADDING));

    return { x: finalX, y: finalY };
  }, []);

  useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      setPosition(prev => getNearestEdgePos(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);

    const savedPos = localStorage.getItem('floating-theme-toggle-pos')
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        setPosition(getNearestEdgePos(parsed.x, parsed.y))
      } catch (e) {
        setPosition(getNearestEdgePos(window.innerWidth - BUTTON_SIZE - PADDING, 100));
      }
    } else {
      setPosition(getNearestEdgePos(window.innerWidth - BUTTON_SIZE - PADDING, 100));
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [getNearestEdgePos])

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    startButtonPos.current = { x: position.x, y: position.y };
    setIsDragging(true);
    setHasMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    
    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasMoved(true);
    }

    // Proposed free position
    const proposedX = startButtonPos.current.x + deltaX;
    const proposedY = startButtonPos.current.y + deltaY;

    // Constraint: move ONLY on the edge
    const edgePos = getNearestEdgePos(proposedX, proposedY);
    setPosition(edgePos);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    localStorage.setItem('floating-theme-toggle-pos', JSON.stringify(position));
  };

  const toggleTheme = () => {
    if (!hasMoved) {
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }
  };

  if (!mounted) return null

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        touchAction: 'none'
      }}
      className={clsx(
        "fixed top-0 left-0 z-[10000] rounded-full flex items-center justify-center sm:hidden",
        "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-xl",
        isDragging ? "scale-110 opacity-100" : "opacity-90 transition-all duration-300 ease-out"
      )}
      aria-label="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-6 w-6 text-white" />
      ) : (
        <Sun className="h-6 w-6 text-gray-900" />
      )}
    </button>
  )
}
