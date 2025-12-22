#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const contentFile = path.join(__dirname, 'content-bank.md');

// Helper to get day of week
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = days[new Date().getDay()];

console.log(`\n📅 Today is **${today}**.`);

// Simple parser for the markdown file
try {
  const content = fs.readFileSync(contentFile, 'utf8');
  const lines = content.split('\n');
  
  let currentSection = '';
  let posts = {
    'Monday': [],
    'Wednesday': [],
    'Friday': []
  };

  let buffer = [];
  let capture = false;

  for (const line of lines) {
    if (line.includes('Monday:')) currentSection = 'Monday';
    else if (line.includes('Wednesday:')) currentSection = 'Wednesday';
    else if (line.includes('Friday:')) currentSection = 'Friday';
    
    if (line.startsWith('**Post')) {
      if (buffer.length > 0 && currentSection) {
        posts[currentSection].push(buffer.join('\n').trim());
      }
      buffer = [];
      capture = true;
    } else if (line.startsWith('##') && capture) {
       // End of section, save last post
       if (buffer.length > 0 && currentSection) {
        posts[currentSection].push(buffer.join('\n').trim());
      }
      buffer = [];
      capture = false;
    } else if (capture) {
      buffer.push(line);
    }
  }
  // Catch the very last one
  if (buffer.length > 0 && currentSection) {
      posts[currentSection].push(buffer.join('\n').trim());
  }

  // Logic to pick a post
  if (['Monday', 'Wednesday', 'Friday'].includes(today)) {
    console.log(`🎯 It\'s a marketing day! Here is a suggested post for ${today}:\n`);
    const dayPosts = posts[today];
    const randomPost = dayPosts[Math.floor(Math.random() * dayPosts.length)];
    console.log('---------------------------------------------------');
    console.log(randomPost);
    console.log('---------------------------------------------------');
  } else {
    console.log("💤 It's not a scheduled marketing day (Mon/Wed/Fri).");
    console.log("But here's a random post from the bank anyway if you feel inspired:\n");
    
    const allPosts = [...posts.Monday, ...posts.Wednesday, ...posts.Friday];
    const randomPost = allPosts[Math.floor(Math.random() * allPosts.length)];
    console.log('---------------------------------------------------');
    console.log(randomPost);
    console.log('---------------------------------------------------');
  }

} catch (err) {
  console.error("Error reading content bank:", err);
}
