// Store IDs of tweets that should not be filtered (user manually restored)
const doNotFilterTweets = new Set();

// Function to check if a tweet is from an automated account
function isAutomatedTweet(tweet) {
    // Skip if this tweet has been manually restored by the user
    if (tweet.dataset.botFilteredSkip === 'true') {
        return false;
    }

    // More specific selector for the "Automated" label based on the HTML structure
    const automatedLabels = tweet.querySelectorAll('div.css-175oi2r.r-1habvwh span.css-1jxf684');

    // Check each potential label
    for (const label of automatedLabels) {
        if (label.textContent && label.textContent.toLowerCase().includes('automated')) {
            return true;
        }
    }

    // Alternative method: look for the specific div structure containing the automated label
    const robotIcon = tweet.querySelector('svg[viewBox="0 0 24 24"] path[d="M.998 15V9h2v6h-2zm22 0V9h-2v6h2zM12 2c-4.418 0-8 3.58-8 8v7c0 2.76 2.239 5 5 5h6c2.761 0 5-2.24 5-5v-7c0-4.42-3.582-8-8-8zM8.998 14c-1.105 0-2-.9-2-2s.895-2 2-2 2 .9 2 2-.895 2-2 2zm6 0c-1.104 0-2-.9-2-2s.895-2 2-2 2 .9 2 2-.896 2-2 2z"]');
    if (robotIcon) {
        return true;
    }
}

// Function to show a previously filtered tweet
function showTweet(tweetId) {

    // Try to find the tweet container with more robust selectors
    let tweetContainer = document.querySelector(`div[data-bot-filtered-id="${tweetId}"]`);

    if (!tweetContainer) {
        console.warn(`Could not find tweet container with data-bot-filtered-id="${tweetId}"`);
        // Try alternative selectors as a fallback
        const allFilteredContainers = document.querySelectorAll('[data-bot-filtered="true"]');
        for (const container of allFilteredContainers) {
            if (container.textContent.includes(tweetId)) {
                tweetContainer = container;
                break;
            }
        }

        if (!tweetContainer) {
            console.error('Failed to find tweet container, cannot show tweet');
            return;
        }
    }

    try {
        // Find our filter overlay
        const filterOverlay = tweetContainer.querySelector('.bot-filter-overlay');
        if (filterOverlay) {
            // Remove the overlay to show the original tweet
            filterOverlay.remove();
        } else {
            console.warn('No filter overlay found');
        }

        // Find the original tweet that was hidden
        const originalTweet = tweetContainer.querySelector('.original-tweet-hidden');
        if (originalTweet) {
            // Show the original tweet
            originalTweet.style.display = '';
            originalTweet.classList.remove('original-tweet-hidden');
        } else {
            console.warn('No hidden original tweet found');

            // Try to find any hidden content and make it visible
            const hiddenElements = tweetContainer.querySelectorAll('[style*="display: none"]');
            hiddenElements.forEach(el => {
                el.style.display = '';
            });
        }

        // Mark this tweet to never be filtered again
        tweetContainer.setAttribute('data-bot-filtered-skip', 'true');

        // Remove the filtered marker but keep the ID for reference
        tweetContainer.removeAttribute('data-bot-filtered');

        // Add to the do-not-filter set
        doNotFilterTweets.add(tweetId);

        // Save the updated list of skipped tweets to localStorage
        saveSkippedTweets();

    } catch (error) {
        console.error('Error showing tweet:', error);
    }
}

// Function to replace automated tweets with custom message
function replaceAutomatedTweets() {
    // Find all tweet articles
    const tweets = document.querySelectorAll('article[role="article"]');

    tweets.forEach(tweet => {
        // Skip if this tweet has been manually restored by the user
        if (tweet.dataset.botFilteredSkip === 'true') {
            return;
        }

        // Skip if the parent container has been marked to skip
        const parentContainer = tweet.closest('div[data-testid="cellInnerDiv"]');
        if (parentContainer && parentContainer.dataset.botFilteredSkip === 'true') {
            return;
        }

        // Skip if this tweet ID is in our do-not-filter set
        if (tweet.id && doNotFilterTweets.has(tweet.id)) {
            return;
        }

        // Skip if we've already processed this tweet
        if (parentContainer && parentContainer.dataset.botFiltered === 'true') {
            return;
        }

        if (isAutomatedTweet(tweet)) {
            // Generate a unique ID for this tweet if it doesn't have one
            const tweetId = tweet.id || 'tweet_' + Math.random().toString(36).substr(2, 9);

            // Get the parent container of the tweet
            const tweetContainer = tweet.closest('div[data-testid="cellInnerDiv"]') || tweet.parentNode;

            if (tweetContainer) {
                // Mark the container for filtering
                tweetContainer.dataset.botFiltered = 'true';
                tweetContainer.dataset.botFilteredId = tweetId;

                // Hide the original tweet but keep it in the DOM
                tweet.style.display = 'none';
                tweet.classList.add('original-tweet-hidden');

                // Create compact filter message
                const filterDiv = document.createElement('div');
                filterDiv.className = 'bot-filter-overlay';
                filterDiv.style.cssText = `
                    padding: 12px 16px;
                    margin: 0;
                    border-bottom: 1px solid rgb(47, 51, 54);
                    color: rgb(113, 118, 123);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.5;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-sizing: border-box;
                    height: 52px;
                `;

                // Create message with robot icon
                const messageContainer = document.createElement('div');
                messageContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                `;

                // Add robot icon
                const robotIcon = document.createElement('div');
                robotIcon.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="rgb(113, 118, 123)">
                        <circle cx="12" cy="12" r="12" fill="rgb(113, 118, 123)"/>
                        <path d="M12 5C8.7 5 6 7.7 6 11v5c0 2 1.7 3.6 3.6 3.6h5c2 0 3.6-1.7 3.6-3.6v-5c0-3.3-2.7-6-6-6zm-3 9c-.8 0-1.5-.7-1.5-1.5S8.2 11 9 11s1.5.7 1.5 1.5S9.8 14 9 14zm6 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm-3.6 3h4.3c.4 0 .7.3.7.7s-.3.7-.7.7h-4.3c-.4 0-.7-.3-.7-.7s.3-.7.7-.7z" fill="white"/>
                        <rect x="4.5" y="9" width="1.5" height="4.5" rx=".75" fill="white"/>
                        <rect x="18" y="9" width="1.5" height="4.5" rx=".75" fill="white"/>
                    </svg>
                `;
                robotIcon.style.marginRight = '8px';

                // Create message span
                const messageSpan = document.createElement('span');
                messageSpan.textContent = 'This Tweet is from an automated account';

                // Add icon and text to message container
                messageContainer.appendChild(robotIcon);
                messageContainer.appendChild(messageSpan);

                // Create show button (styled like Twitter's "Show" button)
                const showButton = document.createElement('button');
                showButton.textContent = 'Show';
                showButton.style.cssText = `
                    padding: 0 16px;
                    height: 32px;
                    background-color: transparent;
                    border: 1px solid rgb(83, 100, 113);
                    border-radius: 16px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                    margin-left: 16px;
                    transition: background-color 0.2s;
                    white-space: nowrap;
                `;

                // Add hover effect
                showButton.addEventListener('mouseover', () => {
                    showButton.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
                });

                showButton.addEventListener('mouseout', () => {
                    showButton.style.backgroundColor = 'transparent';
                });

                showButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Store a reference to the tweet container for direct access
                    const containerRef = tweetContainer;

                    // Add a small delay to ensure the DOM is ready
                    setTimeout(() => {
                        try {
                            showTweet(tweetId);

                            // Fallback: If the tweet is still not visible, try direct DOM manipulation
                            const isVisible = containerRef.querySelector('.original-tweet-hidden') === null;
                            if (!isVisible) {
                                const hiddenTweet = containerRef.querySelector('.original-tweet-hidden');
                                if (hiddenTweet) {
                                    hiddenTweet.style.display = '';
                                    hiddenTweet.classList.remove('original-tweet-hidden');
                                }

                                const overlay = containerRef.querySelector('.bot-filter-overlay');
                                if (overlay) {
                                    overlay.remove();
                                }

                                // Mark as skipped
                                containerRef.dataset.botFilteredSkip = 'true';
                                containerRef.removeAttribute('data-bot-filtered');
                                doNotFilterTweets.add(tweetId);
                                saveSkippedTweets();
                            }
                        } catch (error) {
                            console.error('Error in show button click handler:', error);
                        }
                    }, 50); // Small delay to ensure DOM is ready
                });

                // Add message and button to the filter div
                filterDiv.appendChild(messageContainer);
                filterDiv.appendChild(showButton);

                // Add the filter div to the tweet container
                tweetContainer.appendChild(filterDiv);
            }
        }
    });
}

// Create a more robust MutationObserver
const observer = new MutationObserver((mutations) => {
    // Debounce the function to avoid excessive calls
    if (observer.timeout) {
        clearTimeout(observer.timeout);
    }

    observer.timeout = setTimeout(() => {
        replaceAutomatedTweets();
    }, 100);
});

// Function to start observing
function startObserving() {
    // Find the timeline or main content area
    const timeline = document.querySelector('main[role="main"]') ||
        document.querySelector('div[data-testid="primaryColumn"]') ||
        document.body;

    if (timeline) {
        observer.observe(timeline, {
            childList: true,
            subtree: true
        });
    }
}

// Check for tweets that should be skipped from localStorage
function loadSkippedTweets() {
    try {
        const skippedTweets = localStorage.getItem('twitterBotFilterSkipped');
        if (skippedTweets) {
            const skippedArray = JSON.parse(skippedTweets);
            skippedArray.forEach(id => doNotFilterTweets.add(id));
        }
    } catch (e) {
        console.error('Error loading skipped tweets:', e);
    }
}

// Save skipped tweets to localStorage
function saveSkippedTweets() {
    try {
        localStorage.setItem('twitterBotFilterSkipped', JSON.stringify([...doNotFilterTweets]));
    } catch (e) {
        console.error('Error saving skipped tweets:', e);
    }
}

// Run on page load
loadSkippedTweets();
replaceAutomatedTweets();
startObserving();

// Save skipped tweets when changes are made
setInterval(saveSkippedTweets, 5000);

// Save skipped tweets when the page is unloaded
window.addEventListener('beforeunload', () => {
    saveSkippedTweets();
});

// Also run when URL changes (for single page app navigation)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(replaceAutomatedTweets, 500);
    }
}).observe(document, { subtree: true, childList: true }); 