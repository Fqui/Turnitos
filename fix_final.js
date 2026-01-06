const fs = require('fs');
const content = fs.readFileSync('src/pages/BusinessPortal.jsx', 'utf8');
const lines = content.split('\n');

let startIndex = -1;
for (let i = 1450; i < lines.length; i++) {
    if (lines[i].includes('Siguiente')) {
        startIndex = i;
        break;
    }
}

if (startIndex !== -1) {
    // Found 'Siguiente' at 1515
    // 1516: </button>
    // 1517: </div>
    // 1518: </div>
    // 1519: );
    // 1520: })()}

    // Let's replace from 1517 down to the nearest )} at 1524
    lines[startIndex + 2] = '                                             </div>';
    lines[startIndex + 3] = '                                         </div>';
    lines[startIndex + 4] = '                                     );';
    lines[startIndex + 5] = '                                 })()}';
    lines[startIndex + 6] = '                             </div>';
    lines[startIndex + 7] = '                         </div>';
    lines[startIndex + 8] = '                    </div>';
    lines[startIndex + 9] = '                )}';
    lines[startIndex + 10] = '            </div>';

    // We should probably remove the redundant lines that were pushed down if any.
    // Based on step 3201:
    // 1517: </div>
    // 1518: </div>
    // 1519: );
    // 1520: };)()}
    // 1521: </div>
    // 1522: </div>
    // 1523: </div>
    // 1524: )}
    // 1525: </div>

    fs.writeFileSync('src/pages/BusinessPortal.jsx', lines.join('\n'));
    console.log('Fixed block starting at line', startIndex + 3);
} else {
    console.log('Could not find marker');
}
