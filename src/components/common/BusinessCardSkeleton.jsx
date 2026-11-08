// Placeholder with the same shape as a home business card while the list loads
export default function BusinessCardSkeleton() {
    return (
        <div className="business-card-skeleton" aria-hidden="true">
            <div className="skeleton-block skeleton-cover" />
            <div className="business-card-skeleton__body">
                <div className="skeleton-block skeleton-logo" />
                <div className="business-card-skeleton__text">
                    <div className="skeleton-block skeleton-line" style={{ width: '70%', height: '16px' }} />
                    <div className="skeleton-block skeleton-line" style={{ width: '45%', height: '12px' }} />
                </div>
            </div>
        </div>
    );
}
