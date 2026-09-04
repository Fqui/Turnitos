const fs = require('fs');
const content = fs.readFileSync('src/pages/BusinessPortal.jsx', 'utf8');
const lines = content.split('\n');

// We need to find the pagination block end
let sigIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Siguiente')) {
        sigIndex = i;
    }
}

if (sigIndex !== -1) {
    // We want to replace everything from 1517 to 1525 with the correct closures
    // Based on current view:
    // 1515: Siguiente
    // 1516: </button>
    // 1517: </div>
    // 1518: </div>
    // 1519: );
    // 1520: })()}
    // 1521: </div>
    // 1522: </div>
    // 1523: </div>
    // 1524: )}
    // 1525: </div>

    // Correct logic:
    // 1517:                                             </div> // closes buttons gap
    // 1518:                                         </div> // closes pagination bar
    // 1519:                                     );
    // 1520:                                 })()}
    // 1521:                             </div> // closes Scrollable 1236
    // 1522:                         </div> // closes Card 1227
    // 1523:                     ) // closes viewMode plast branch
    // 1524:                 }</div> // closes fadeIn 1004
    // 1525:             )} // closes loading ternary (998)
    // 1526:         </div> // closes Main Content (986)

    // Wait, let's check line 2013 again. It also has a </div>.
    // If I close 986 at 1526, then 2013 closes 743. Correct.

    const startFix = sigIndex + 2; // Line 1517
    lines[startFix] = '                                            </div>';
    lines[startFix + 1] = '                                        </div>';
    lines[startFix + 2] = '                                    );';
    lines[startFix + 3] = '                                })()}';
    lines[startFix + 4] = '                            </div>';
    lines[startFix + 5] = '                        </div>';
    lines[startFix + 6] = '                    )';
    lines[startFix + 7] = '                }</div>';
    lines[startFix + 8] = '            )}';
    lines[startFix + 9] = '        </div>';

    fs.writeFileSync('src/pages/BusinessPortal.jsx', lines.join('\n'));
    console.log('Successfully fixed BusinessPortal structure');
} else {
    console.log('Could not find marker');
}
