// getBusinessBySlug throws 'Business not found...' when the slug does not exist;
// any other error (network, server) means the business could not be loaded.
export const isBusinessNotFoundError = (error) =>
    typeof error?.message === 'string' && error.message.startsWith('Business not found');
