/**
 * TurnitosLR - Google Sheets + Calendar Backend
 * 
 * Instructions:
 * 1. Paste this code into Code.gs
 * 2. Run 'setupSheet' to create 'Bookings' and 'Businesses' sheets
 * 3. Deploy as Web App (Execute as: Me, Who has access: Anyone)
 * 4. Authorize the script (now includes Calendar access)
 */

function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({
            'result': 'success',
            'message': 'Server is running. Calendar & Sheets integration active.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const data = JSON.parse(e.postData.contents);

        // --- ACTION: ADD BOOKING ---
        if (data.action === 'addBooking') {
            const booking = data.booking;
            const bookingsSheet = ss.getSheetByName('Bookings');

            // 1. Add to Google Sheets
            bookingsSheet.appendRow([
                booking.timestamp,
                booking.businessName,
                booking.businessId,
                booking.service,
                booking.date,
                booking.time,
                booking.price,
                booking.customerName,
                booking.customerEmail,
                booking.customerPhone,
                booking.status
            ]);

            // 2. Add to Google Calendar
            let calendarEventId = 'NOT_CREATED';
            try {
                // Parse date and time (Assuming DD/MM/YYYY and HH:mm)
                const dateParts = booking.date.split('/');
                const timeParts = booking.time.split(':');

                // Create Date object (Month is 0-indexed)
                const startDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]);
                const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // Default 1 hour duration

                // Get Calendar (Default to user's primary, or use a specific ID if you have one)
                const calendar = CalendarApp.getDefaultCalendar();

                const eventTitle = `Reserva: ${booking.businessName} - ${booking.service}`;
                const eventDesc = `Cliente: ${booking.customerName}\nTel: ${booking.customerPhone}\nEstado: ${booking.status}`;

                const event = calendar.createEvent(eventTitle, startDate, endDate, {
                    description: eventDesc,
                    location: booking.businessName
                });

                calendarEventId = event.getId();
            } catch (calError) {
                console.error('Calendar Error:', calError);
                calendarEventId = 'ERROR: ' + calError.toString();
            }

            return ContentService
                .createTextOutput(JSON.stringify({
                    'result': 'success',
                    'row': bookingsSheet.getLastRow(),
                    'calendarEventId': calendarEventId
                }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: GET BOOKINGS ---
        if (data.action === 'getBookings') {
            const bookingsSheet = ss.getSheetByName('Bookings');
            const rows = bookingsSheet.getDataRange().getValues();
            const bookings = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                bookings.push({
                    timestamp: row[0],
                    businessName: row[1],
                    businessId: row[2],
                    service: row[3],
                    date: row[4],
                    time: row[5],
                    price: row[6],
                    customerName: row[7],
                    customerEmail: row[8],
                    customerPhone: row[9],
                    status: row[10]
                });
            }

            return ContentService
                .createTextOutput(JSON.stringify({ 'result': 'success', 'bookings': bookings }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: CANCEL BOOKING ---
        if (data.action === 'cancelBooking') {
            const bookingsSheet = ss.getSheetByName('Bookings');
            const rows = bookingsSheet.getDataRange().getValues();

            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] == data.timestamp && rows[i][2] == data.businessId) {
                    bookingsSheet.getRange(i + 1, 11).setValue('cancelled');
                    return ContentService
                        .createTextOutput(JSON.stringify({ 'result': 'success' }))
                        .setMimeType(ContentService.MimeType.JSON);
                }
            }
            return ContentService
                .createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Booking not found' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: GET BUSINESSES ---
        if (data.action === 'getBusinesses') {
            const businessSheet = ss.getSheetByName('Businesses');
            if (!businessSheet) {
                return ContentService
                    .createTextOutput(JSON.stringify({ 'result': 'success', 'businesses': [] })) // Return empty if not setup
                    .setMimeType(ContentService.MimeType.JSON);
            }

            const rows = businessSheet.getDataRange().getValues();
            const businesses = [];

            // Assuming headers: ID, Name, Category, Location, ImageURL
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                businesses.push({
                    id: row[0],
                    name: row[1],
                    category: row[2],
                    location: row[3],
                    image: row[4]
                });
            }
            return ContentService
                .createTextOutput(JSON.stringify({ 'result': 'success', 'businesses': businesses }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService
            .createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Invalid action' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService
            .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

function setupSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Setup Bookings Sheet
    let bookingsSheet = ss.getSheetByName('Bookings');
    if (!bookingsSheet) {
        bookingsSheet = ss.insertSheet('Bookings');
        const headers = [
            'Timestamp', 'Business Name', 'Business ID', 'Service/Sport',
            'Date', 'Time', 'Price', 'Customer Name', 'Customer Email',
            'Customer Phone', 'Status'
        ];
        bookingsSheet.appendRow(headers);
        bookingsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
        bookingsSheet.setFrozenRows(1);
    }

    // 2. Setup Businesses Sheet
    let businessSheet = ss.getSheetByName('Businesses');
    if (!businessSheet) {
        businessSheet = ss.insertSheet('Businesses');
        const headers = ['ID', 'Name', 'Category', 'Location', 'Image URL'];
        businessSheet.appendRow(headers);
        businessSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e3f2fd');
        businessSheet.setFrozenRows(1);

        // Add some sample data if empty
        businessSheet.appendRow(['1', 'Padel Center', 'paddle', 'Av. Principal 123', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8']);
        businessSheet.appendRow(['2', 'Fútbol 5 Estrellas', 'football', 'Calle Deportiva 456', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55']);
    }
}
