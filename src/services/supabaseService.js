import { supabase } from './supabaseClient';
import * as businessService from './supabase/businessService';
import * as bookingService from './supabase/bookingService';
import * as resourceService from './supabase/resourceService';
import * as subscriptionService from './supabase/subscriptionService';
import * as storageService from './supabase/storageService';
import * as customerService from './supabase/customerService';
import * as promotionService from './supabase/promotionService';
import * as categoryService from './supabase/categoryService';
import * as sellerService from './supabase/sellerService';
import * as storeService from './supabase/storeService';
import * as reviewService from './supabase/reviewService';

class SupabaseService {
    // --- Helpers ---
    _processBusinessData(data) {
        return businessService.processBusinessData(data);
    }

    // --- Businesses & Auth ---
    async getBusinesses() {
        return businessService.getBusinesses();
    }

    async getNearbyBusinesses(lat, lng, radius = 5000) {
        return businessService.getNearbyBusinesses(lat, lng, radius);
    }

    async getBusinessById(id) {
        return businessService.getBusinessById(id);
    }

    async getSpecialists(businessId) {
        return businessService.getSpecialists(businessId);
    }

    async getBusinessBySlug(slug) {
        return businessService.getBusinessBySlug(slug);
    }

    async login(email, password) {
        return businessService.login(email, password);
    }

    async logout() {
        return businessService.logout();
    }

    async createBusiness(businessData) {
        return businessService.createBusiness(businessData);
    }

    async updateBusiness(businessId, businessData) {
        return businessService.updateBusiness(businessId, businessData);
    }

    async patchBusiness(businessId, updates) {
        return businessService.patchBusiness(businessId, updates);
    }

    async syncBusinessResources(businessId, businessType, requestedCount, price = null) {
        return resourceService.syncBusinessResources(businessId, businessType, requestedCount, price);
    }

    // --- Bookings ---
    async getBookings(businessId, date = null) {
        return bookingService.getBookings(businessId, date);
    }

    async validateBookingAvailability(businessId, startTime, endTime, excludeBookingId = null) {
        return bookingService.validateBookingAvailability(businessId, startTime, endTime, excludeBookingId);
    }

    async createBooking(bookingData) {
        const data = await bookingService.createBooking(bookingData);
        return this._processBusinessData(data);
    }

    async updateBookingStatus(id, status, metadata = {}) {
        const data = await bookingService.updateBookingStatus(id, status, metadata);
        return this._processBusinessData(data);
    }

    async updateBooking(id, updates = {}) {
        const data = await bookingService.updateBooking(id, updates);
        return this._processBusinessData(data);
    }

    async moveBooking(id, newDate, newTime, newItemId) {
        const data = await bookingService.moveBooking(id, newDate, newTime, newItemId);
        return this._processBusinessData(data);
    }

    async cancelBooking(id, reason = '') {
        return this.updateBookingStatus(id, 'cancelled', { reason });
    }

    async deleteBooking(id) {
        return bookingService.deleteBooking(id);
    }

    async createBookingV2(bookingData) {
        return bookingService.createBookingV2(bookingData);
    }

    async getBookingsV2(businessId, startDate = null, endDate = null) {
        return bookingService.getBookingsV2(businessId, startDate, endDate);
    }

    // --- Realtime Subscriptions ---
    subscribeToBookings(businessId, callback) {
        return bookingService.subscribeToBookings(businessId, callback);
    }

    subscribeToBusiness(businessId, callback) {
        return bookingService.subscribeToBusiness(businessId, callback);
    }

    // --- Specialist Availability & Assignment ---
    async getQualifiedSpecialists(serviceId, businessId = null) {
        return bookingService.getQualifiedSpecialists(serviceId, businessId);
    }

    async updateServiceSpecialists(serviceId, specialistIds) {
        return bookingService.updateServiceSpecialists(serviceId, specialistIds);
    }

    async getSpecialistBookings(specialistId, date) {
        return bookingService.getSpecialistBookings(specialistId, date);
    }

    async isSpecialistAvailable(specialistId, date, time, duration) {
        return bookingService.isSpecialistAvailable(specialistId, date, time, duration);
    }

    async getAvailableSpecialists(serviceId, date, time, duration, businessId = null) {
        return bookingService.getAvailableSpecialists(serviceId, date, time, duration, businessId);
    }

    // --- Resources ---
    async getResources(businessId, type = null) {
        return resourceService.getResources(businessId, type);
    }

    async getResourceById(resourceId) {
        return resourceService.getResourceById(resourceId);
    }

    async createResource(resourceData) {
        return resourceService.createResource(resourceData);
    }

    async updateResource(resourceId, updates) {
        return resourceService.updateResource(resourceId, updates);
    }

    async deleteResource(resourceId) {
        return resourceService.deleteResource(resourceId);
    }

    async checkResourceAvailability(resourceId, startTime, endTime, excludeBookingId = null) {
        return resourceService.checkResourceAvailability(resourceId, startTime, endTime, excludeBookingId);
    }

    // --- Subscriptions ---
    async getSubscription(businessId) {
        return subscriptionService.getSubscription(businessId);
    }

    async getMonthlyBookingsStats(businessId, monthDate = new Date()) {
        return subscriptionService.getMonthlyBookingsStats(businessId, monthDate);
    }

    async getSubscriptionPlans(businessType = null) {
        return subscriptionService.getSubscriptionPlans(businessType);
    }

    async updateSubscription(businessId, planId) {
        return subscriptionService.updateSubscription(businessId, planId);
    }

    async getSubscriptionPlanById(id) {
        return subscriptionService.getSubscriptionPlanById(id);
    }

    async _createDefaultSubscription(businessId, planId = null) {
        return subscriptionService.createDefaultSubscription(businessId, planId);
    }

    // --- Storage ---
    getPublicUrl(path) {
        return storageService.getPublicUrl(path);
    }

    async uploadImage(file) {
        return storageService.uploadImage(file);
    }

    // --- Customers (CRM) ---
    async getCustomers(businessId) {
        const data = await customerService.getCustomers(businessId);
        return this._processBusinessData(data);
    }

    async updateCustomer(customerId, customerData) {
        const data = await customerService.updateCustomer(customerId, customerData);
        return this._processBusinessData(data);
    }

    async getCustomerBookings(businessId, customerPhone) {
        const data = await customerService.getCustomerBookings(businessId, customerPhone);
        return this._processBusinessData(data);
    }

    // --- Promotions ---
    async getPromotions() {
        const data = await promotionService.getPromotions();
        return this._processBusinessData(data);
    }

    async getPromotionById(promoId) {
        return promotionService.getPromotionById(promoId);
    }

    async createPromotion(promotionData) {
        return promotionService.createPromotion(promotionData);
    }

    async deletePromotion(promotionId) {
        return promotionService.deletePromotion(promotionId);
    }

    // --- Categories & Subcategories ---
    async getCategories(businessType = null) {
        return categoryService.getCategories(businessType);
    }

    async getCategoryById(id) {
        return categoryService.getCategoryById(id);
    }

    async createCategory(categoryData) {
        return categoryService.createCategory(categoryData);
    }

    async updateCategory(id, categoryData) {
        return categoryService.updateCategory(id, categoryData);
    }

    async deleteCategory(id) {
        return categoryService.deleteCategory(id);
    }

    async getSubcategories(categoryId = null) {
        return categoryService.getSubcategories(categoryId);
    }

    async createSubcategory(subcategoryData) {
        return categoryService.createSubcategory(subcategoryData);
    }

    async updateSubcategory(id, subcategoryData) {
        return categoryService.updateSubcategory(id, subcategoryData);
    }

    async deleteSubcategory(id) {
        return categoryService.deleteSubcategory(id);
    }

    // --- Seller & Super Admin ---
    async loginSeller(email, password) {
        return sellerService.loginSeller(email, password);
    }

    async getSellerBusinesses(sellerId) {
        return sellerService.getSellerBusinesses(sellerId);
    }

    async createBusinessBySeller(sellerId, businessData) {
        return sellerService.createBusinessBySeller(sellerId, businessData, (b) => this.createBusiness(b));
    }

    async updateBusinessBySeller(sellerId, businessId, businessData) {
        return sellerService.updateBusinessBySeller(sellerId, businessId, businessData, (id, b) => this.updateBusiness(id, b));
    }

    async processSubscriptionPayment(businessId, planId, paymentCycle = 'monthly') {
        return sellerService.processSubscriptionPayment(businessId, planId, paymentCycle);
    }

    async calculateCommission(businessId, paymentId) {
        return sellerService.calculateCommission(businessId, paymentId);
    }

    async getSellerCommissions(sellerId, month, year) {
        return sellerService.getSellerCommissions(sellerId, month, year);
    }

    async getSellerStats(sellerId) {
        return sellerService.getSellerStats(sellerId);
    }

    async getSellerMonthlyProjection(sellerId) {
        return sellerService.getSellerMonthlyProjection(sellerId);
    }

    async changeBusinessPassword(businessId, oldPassword, newPassword) {
        return sellerService.changeBusinessPassword(businessId, oldPassword, newPassword);
    }

    async loginSuperAdmin(email, password) {
        return sellerService.loginSuperAdmin(email, password);
    }

    async getAllSellers() {
        return sellerService.getAllSellers();
    }

    async getGlobalAnalytics() {
        return sellerService.getGlobalAnalytics();
    }

    async getAllBusinesses() {
        return sellerService.getAllBusinesses();
    }

    async getCommissionTrends(months = 6) {
        return sellerService.getCommissionTrends(months);
    }

    async getBusinessGrowthTrends(months = 6) {
        return sellerService.getBusinessGrowthTrends(months);
    }

    async updateSellerStatus(sellerId, isActive) {
        return sellerService.updateSellerStatus(sellerId, isActive);
    }

    async getSellerDetailedReport(sellerId) {
        return sellerService.getSellerDetailedReport(sellerId);
    }

    async createBusinessAsSuperAdmin(businessData) {
        return this.createBusiness(businessData);
    }

    async updateBusinessAsSuperAdmin(businessId, businessData) {
        return sellerService.updateBusinessAsSuperAdmin(businessId, businessData, (id, t, c, p) => this.syncBusinessResources(id, t, c, p));
    }

    async updateCurrentPassword(newPassword, userEmail = null, businessId = null) {
        return sellerService.updateCurrentPassword(newPassword, userEmail, businessId);
    }

    async resetBusinessPasswordAsSuperAdmin(businessId, businessName) {
        return sellerService.resetBusinessPasswordAsSuperAdmin(businessId, businessName);
    }

    async deleteBusinessAsSuperAdmin(businessId) {
        return sellerService.deleteBusinessAsSuperAdmin(businessId);
    }

    async getBookingsAnalytics() {
        return sellerService.getBookingsAnalytics();
    }

    async getSellerDetails(sellerId) {
        return sellerService.getSellerDetails(sellerId);
    }

    // --- Store Products ---
    async getStoreProducts(businessId, onlyActive = false) {
        return storeService.getStoreProducts(businessId, onlyActive);
    }

    async createStoreProduct(productData) {
        return storeService.createStoreProduct(productData);
    }

    async updateStoreProduct(id, productData) {
        return storeService.updateStoreProduct(id, productData);
    }

    async deleteStoreProduct(id) {
        return storeService.deleteStoreProduct(id);
    }

    // --- Verified Reviews ---
    async generateReviewToken(booking) {
        return reviewService.generateReviewToken(booking);
    }

    async getReviewInfoByToken(token) {
        return reviewService.getReviewInfoByToken(token);
    }

    async submitReviewByToken(token, { rating, comment, customer_name }) {
        return reviewService.submitReviewByToken(token, { rating, comment, customer_name });
    }

    async _recalculateBusinessRating(businessId) {
        return reviewService.recalculateBusinessRating(businessId);
    }

    async getReviewsByBusinessId(businessId) {
        return reviewService.getReviewsByBusinessId(businessId);
    }

    async getAllReviewsForSuperAdmin() {
        return reviewService.getAllReviewsForSuperAdmin();
    }

    async deleteOrModerateReview(reviewId, status = 'rejected') {
        return reviewService.deleteOrModerateReview(reviewId, status);
    }
}

export default new SupabaseService();
