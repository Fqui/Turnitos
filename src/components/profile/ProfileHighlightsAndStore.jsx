import React from 'react';
import ProfileHighlightsBar from './ProfileHighlightsBar';
import ProfileStorePromoCard, { getSafeStoreProducts } from './ProfileStorePromoCard';
import ProfileAboutCard, { getPublicSpecialists } from './ProfileAboutCard';
import { isStoreAvailable } from '../../utils/storeUtils';

export default function ProfileHighlightsAndStore({
    business,
    primaryColor = '#10b981',
    permanentHighlights = [],
    onSelectHighlight
}) {
    const products = getSafeStoreProducts(business);
    const hasHighlights = Boolean(permanentHighlights && permanentHighlights.length > 0);
    const hasStore = isStoreAvailable(business);
    // Without a store, the "Nosotros" card (team) takes the store's slot
    const hasAbout = !hasStore && getPublicSpecialists(business).length > 0;

    // No store and no team: show only the highlights (or nothing)
    if (!hasStore && !hasAbout) {
        if (!hasHighlights) return null;
        return (
            <ProfileHighlightsBar
                permanentHighlights={permanentHighlights}
                onSelectHighlight={onSelectHighlight}
            />
        );
    }

    // Case 1: No highlights at all -> render the side card full-width
    if (!hasHighlights) {
        if (hasAbout) {
            return (
                <div className="profile-highlights-and-store">
                    <div className="profile-store-wrapper profile-about-wrapper-full">
                        <ProfileAboutCard business={business} primaryColor={primaryColor} />
                    </div>
                </div>
            );
        }
        return (
            <ProfileStorePromoCard
                business={business}
                products={products}
                primaryColor={primaryColor}
                isFullWidth={true}
            />
        );
    }

    // Case 2: Highlights exist -> render Highlights + Store Promo / About Card
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
                {hasAbout ? (
                    <ProfileAboutCard business={business} primaryColor={primaryColor} />
                ) : (
                    <ProfileStorePromoCard
                        business={business}
                        products={products}
                        primaryColor={primaryColor}
                        isFullWidth={false}
                    />
                )}
            </div>
        </div>
    );
}
