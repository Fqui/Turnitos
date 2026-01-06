const fs = require('fs');

function fixPortal() {
    const filePath = 'src/pages/BusinessPortal.jsx';
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix the mobile list closures (around line 1374)
    // We want paginated.map(...) => ( ... ) ) } )() }
    // Wait, the mobile part looks like:
    // {isMobile ? (
    //   <div ...>
    //     {(() => {
    //        ...
    //        return paginated.map(...)
    //     })()}
    //   </div>
    // ) : (

    // Looking at current file:
    // 1374:                                                 ))
    // 1375:                                             })()}
    // 1376:                                         </div>
    // This part actually looked okay in step 3214.

    // 2. Fix the desktop list and pagination mess (around 1515)
    // We need to replace the area from where 'Siguiente' ends to where the ternary ends.

    const lignes = content.split('\n');
    let startPagination = -1;
    for (let i = 0; i < lignes.length; i++) {
        if (lignes[i].includes('/* Pagination Controls */')) {
            startPagination = i;
            break;
        }
    }

    if (startPagination !== -1) {
        // We found the start of pagination.
        // Let's find where the buttons end ('Siguiente')
        let endButtons = -1;
        for (let i = startPagination; i < lignes.length; i++) {
            if (lignes[i].includes('Siguiente')) {
                endButtons = i;
                break;
            }
        }

        if (endButtons !== -1) {
            // Now replace the whole mess from after 'Siguiente' button to where the modals start.
            // Looking at step 3261, the mess is roughly from endButtons + 1 (1516) to 1525.

            const cleanPaginationClosure = `                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                )}
            </div>`;

            // But wait, the structure I want is:
            // </div> // for buttons gap:8px (start 1482)
            // </div> // for pagination bar padding:16px (start 1469)
            // ) // for return of pagination IIFE (start 1468)
            // })() // for pagination IIFE closure (start 1457)
            // </div> // for main content area container (start 1227)
            // </div> // for viewMode ternary else content area (maybe redundant?)

            // Let's re-examine tags from 1227:
            // 1227: <div ... (Outer container)
            // 1236: <div ... (Scrollable container)
            // 1238: <div ... (Filters) -> closed at 1318
            // 1320: {isMobile ? (
            // 1322:    <div ... (Mobile container)
            // 1323:       {(() => { ... })()} // IIFE
            // 1376:    </div>
            // 1377: ) : (
            // 1378:    <table>...</table>
            // 1454: )}
            // 1455: </div> // closing 1236 (Scrollable) -> THIS IS WHERE WE NEED TO BE CAREFUL.

            // If we close 1236 at 1455, then pagination is OUTSIDE the scrollable area (GOOD).
            // Then we have pagination controls.
            // Then we close 1227.

            const startOfPaginationArea = lignes.slice(0, startPagination).join('\n');
            // Re-implement the pagination block clearly
            const paginationBlock = `                                {(() => {
                                    const filtered = bookings.filter(booking => {
                                        const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                            (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
                                        const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                        const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                        return matchesSearch && matchesStatus && matchesDate;
                                    });
                                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                    if (totalPages <= 1) return null;

                                    return (
                                        <div style={{
                                            padding: '16px 20px',
                                            borderTop: '1px solid var(--border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'var(--bg-main)',
                                            borderBottomLeftRadius: '16px',
                                            borderBottomRightRadius: '16px'
                                        }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} reservas)
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-card)',
                                                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        cursor: currentPage === 1 ? 'default' : 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        opacity: currentPage === 1 ? 0.5 : 1
                                                    }}
                                                >
                                                    Anterior
                                                </button>
                                                <button
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: currentPage === totalPages ? 'var(--bg-main)' : 'var(--bg-card)',
                                                        color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        cursor: currentPage === totalPages ? 'default' : 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        opacity: currentPage === totalPages ? 0.5 : 1
                                                    }}
                                                >
                                                    Siguiente
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>`;

            // Find where the booking modal starts to join back
            let modalStart = -1;
            for (let i = endButtons; i < lignes.length; i++) {
                if (lignes[i].includes('Booking Details Modal')) {
                    modalStart = i;
                    break;
                }
            }

            if (modalStart !== -1) {
                const endPart = lignes.slice(modalStart).join('\n');

                // Final check on root closures
                // The root closures at the very end of the file also need fixing.
                // 2011: )
                // 2012: }
                // 2013: </div>
                // 2014: );
                // 2015: }

                let finalContent = startOfPaginationArea + '\n' + paginationBlock + '\n            ' + endPart;

                // Fix the end of file specifically
                finalContent = finalContent.replace(/\n\s+\)\s+\}\s+<\/div>\s+\);\s+\}/g, '\n                )\n            }\n        </div>\n    );\n}');

                fs.writeFileSync(filePath, finalContent);
                console.log('BusinessPortal.jsx structurally fixed');
            }
        }
    }
}

fixPortal();
