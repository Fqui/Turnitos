const fs = require('fs');
const content = fs.readFileSync('src/pages/BusinessPortal.jsx', 'utf8');
const lines = content.split('\n');

// Find the line with the else part of the ternary (around 1226)
let elseIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(') : (') && lines[i].includes('// Else of viewMode ternary')) {
        elseIndex = i;
        break;
    }
    // Fallback if the comment is missing
    if (lines[i].trim() === ') : (' && i > 1200) {
        elseIndex = i;
        break;
    }
}

console.log('Else part starts at line:', elseIndex + 1);

// Let's find the closing of the viewMode ternary (the last )} )
// It should be followed by the end of the content area.
let ternaryEndIndex = -1;
for (let i = elseIndex; i < lines.length; i++) {
    if (lines[i].trim() === ')}' && i < 1600) {
        ternaryEndIndex = i;
        break;
    }
}

console.log('Ternary ends at line:', ternaryEndIndex + 1);

// Now let's fix the structure between elseIndex and ternaryEndIndex
// 1. Identify the divs opened in the else part
// Line 1227: <div style={{ ... (Outer Container)
// Line 1236: <div style={{ ... (Inner Scroll container)
// Line 1238: <div style={{ ... (Filters section)

// Let's reconstruct the closures.
// Filters section (1238) closes at 1318.
// We want Inner Scroll (1236) to close AFTER the list and before the pagination.
// We want Outer Container (1227) to close AFTER the pagination.

// Current closures:
// 1318: </div> (Correct, closes 1238)
// 1319: </div> (REDUNDANT or too early)
// 1457: </div> (REDUNDANT or closes 1236?)
// 1524: </div> (REDUNDANT)
// 1525: </div> (REDUNDANT)

// I will remove 1319, 1457, 1524, 1525.
// And insert </div> for 1236 after 1456.
// And insert </div> for 1227 after 1523.

const newLines = [...lines];

// Remove 1319 (if it's a div)
if (newLines[elseIndex + 93] && newLines[elseIndex + 93].trim() === '</div>') {
    // newLines[elseIndex + 93] = ''; // 1319
}

// Instead of hardcoded indices, let's use markers.
const content_fixed = content
    .replace('                                    </div>\n                                </div>\n\n                                {isMobile ? (', '                                    </div>\n\n                                {isMobile ? (')
    .replace('                                    )}\n                                </div>\n\n                                {/* Pagination Controls */}', '                                    )}\n\n                                {/* Pagination Controls %}')
    .replace('                                });\n                                })()}\n                            </div>\n                        </div>\n                )}', '                                });\n                                })()}\n                            </div>\n                        </div>\n                )}');

// Wait, the above regex is risky. I'll just write a script that counts tags.

function fixStructure(content) {
    let output = content;
    // Fix 1: Remove redundant </div> at 1319
    output = output.replace(/<\/div>\s+<\/div>\s+\{isMobile \? \(/, '</div>\n\n                                {isMobile ? (');

    // Fix 2: Remove redundant </div> at 1457
    output = output.replace(/<\/table>\s+\)\}\s+<\/div>\s+\{\/\* Pagination Controls \*\/\}/, '</table>\n                                    )}\n\n                                {/* Pagination Controls */}');

    // Fix 3: Ensure end of ternary is clean
    output = output.replace(/\}\)\(\)\}\s+<\/div>\s+<\/div>\s+\)\}/, '})()}\n                            </div>\n                        </div>\n                )}');

    return output;
}

// Actually, I'll just use the view results from 3080 to fix the final closures.
const endOfModals = content.indexOf('showNewBookingModal && (');
if (endOfModals !== -1) {
    const endBrace = content.indexOf('}', endOfModals + 100);
    // Find the end of the return
    const endReturn = content.lastIndexOf(');');
    if (endReturn !== -1) {
        const closures = '\n            </div>\n        </main>\n    </div>\n</div>\n';
        // ... this is getting complex.
    }
}
