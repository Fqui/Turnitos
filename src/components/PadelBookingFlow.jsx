import React, { useState, useEffect } from 'react';
import PadelTimeline from './PadelTimeline';
import PadelMobileATC from './PadelMobileATC';

const PadelBookingFlow = ({
    courts,
    selectedDate,
    existingBookings,
    openingTime,
    closingTime,
    timeRanges, // 🆕 Add timeRanges for split shifts
    onSlotSelect,
    sportColor = '#00e676',
    slotPromo = null
}) => {
    const [isMobile, setIsMobile] = useState(false);

    // Detect viewport size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle slot selection (passed directly from timelines)
    const handleSlotSelect = (slotData) => {
        onSlotSelect(slotData);
    };

    if (isMobile) {
        // Mobile: ATC Style Flow
        return (
            <PadelMobileATC
                courts={courts}
                selectedDate={selectedDate}
                existingBookings={existingBookings}
                openingTime={openingTime}
                closingTime={closingTime}
                timeRanges={timeRanges} // 🆕 Pass timeRanges
                onSlotSelect={handleSlotSelect}
                sportColor={sportColor}
                slotPromo={slotPromo}
            />
        );
    }

    // Desktop: Horizontal Timeline View
    return (
        <PadelTimeline
            courts={courts}
            selectedDate={selectedDate}
            existingBookings={existingBookings}
            openingTime={openingTime}
            closingTime={closingTime}
            timeRanges={timeRanges} // 🆕 Pass timeRanges
            onSlotSelect={handleSlotSelect}
            sportColor={sportColor}
            slotPromo={slotPromo}
        />
    );
};


export default PadelBookingFlow;
