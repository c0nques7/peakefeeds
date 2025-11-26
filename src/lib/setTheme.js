(function() {
  // Check if dark theme is saved in localStorage
  const savedTheme = localStorage.getItem('peake-theme');
  
  // Set the attribute on the HTML element immediately if it's dark
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    // Ensure light mode is set explicitly if nothing is saved
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();