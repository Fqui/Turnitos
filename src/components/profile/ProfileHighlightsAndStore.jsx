import React from 'react';
import ProfileHighlightsBar from './ProfileHighlightsBar';
import ProfileStorePromoCard, { getSafeStoreProducts } from './ProfileStorePromoCard';

export default function ProfileHighlightsAndStore({
    business,
    primaryColor = '#10b981',
    permanentHighlights = [],
    onSelectHighlight
}) {
    const products = getSafeStoreProducts(business);
    const hasHighlights = Boolean(permanentHighlights && permanentHighlights.length > 0);

    // Case 1: No highlights at all -> render full-width store banner
    if (!hasHighlights) {
        return (
            <ProfileStorePromoCard
                business={business}
                products={products}
                primaryColor={primaryColor}
                isFullWidth={true}
            />
        );
    }

    // Case 2: Highlights exist -> render Highlights + Store Promo Card
    // (Desktop: side-by-side, Mobile: stacked)
    return (
        <div className="profile-highlights-and-store">
            <div className="profile-highlights-wrapper">
                <ProfileHighlightsBar
                    permanentHighlights={permanentHighlights}
                    onSelectHighlight={onSelectHighlight}
                    noBorder={true}
                />
            </div>
            <div className="profile-store-wrapper">
                <ProfileStorePromoCard
                    business={business}
                    products={products}
                    primaryColor={primaryColor}
                    isFullWidth={false}
                />
            </div>
        </div>
    );
}
