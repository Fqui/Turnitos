const fs = require('fs');
const content = fs.readFileSync('src/pages/BusinessPortal.jsx', 'utf8');
const lines = content.split('\n');

// Find the line with isMobile ? (
let isMobileIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{isMobile ? (') && lines[i].includes('div')) {
        // This might be the one. But wait, I see {isMobile ? ( at 1321.
    }
}

// Let's just find the pattern )) } })() } around line 1375
// and replace it with )) } })()
const oldPattern = /}}\s*}\s*}\)\(\)}\s*<\/div>\s*\) : \(/;
// Wait, my view file showed )) } })() }.
// map closes with ))
// IIFE closes with })()
// div closes with </div>
// ternary part closes with ) : (

const searchString = '))';
const searchIndex = content.indexOf(searchString, content.indexOf('{isMobile ? ('));

if (searchIndex !== -1) {
    // Look ahead from searchIndex (1374)
    const sub = content.substring(searchIndex);
    // Find })() followed by </div> followed by ) : (
    const endMatch = sub.match(/\)\s*}\s*}\)\(\)}\s+<\/div>\s+\) : \(/);
    if (endMatch) {
        // Replacement should be )) \n })() \n </div> \n ) : (
        const fixed = '))\n                                            })()}\n                                        </div>\n                                    ) : (';
        const newContent = content.substring(0, searchIndex) + fixed + content.substring(searchIndex + endMatch[0].length);
        fs.writeFileSync('src/pages/BusinessPortal.jsx', newContent);
        console.log('Fixed mobile view structure');
    } else {
        console.log('Could not find exact pattern');
        // Let's log what we found
        console.log('Substring:', sub.substring(0, 100));
    }
}
