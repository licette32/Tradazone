/**
 * @fileoverview Form validation tests for Auth module fixes
 * 
 * Tests the form validation fixes implemented to prevent submission
 * without required fields in the Auth module and related forms.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddCustomer from '../pages/customers/AddCustomer';
import CreateCheckout from '../pages/checkouts/CreateCheckout';
import PasswordSettings from '../pages/settings/PasswordSettings';

// Mock the context providers
vi.mock('../context/DataContext', () => ({
    useData: () => ({
        addCustomer: vi.fn(),
        addCheckout: vi.fn(() => ({ id: '123', title: 'Test', amount: '100', currency: 'STRK', paymentLink: 'test-link' }))
    })
}));

vi.mock('../services/webhook', () => ({
    dispatchWebhook: vi.fn()
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Form Validation Fixes', () => {
    describe('AddCustomer Form', () => {
        test('prevents submission with empty required fields', async () => {
            const mockAddCustomer = vi.fn();
            vi.mocked(require('../context/DataContext').useData).mockReturnValue({
                addCustomer: mockAddCustomer
            });

            renderWithRouter(<AddCustomer />);
            
            const submitButton = screen.getByText('Add Customer');
            fireEvent.click(submitButton);

            // Should show validation errors
            await waitFor(() => {
                expect(screen.getByText('Customer name is required')).toBeInTheDocument();
                expect(screen.getByText('Email address is required')).toBeInTheDocument();
            });

            // Should not call addCustomer
            expect(mockAddCustomer).not.toHaveBeenCalled();
        });

        test('validates email format', async () => {
            renderWithRouter(<AddCustomer />);
            
            const nameInput = screen.getByPlaceholderText('Enter customer name');
            const emailInput = screen.getByPlaceholderText('Enter email address');
            const submitButton = screen.getByText('Add Customer');

            fireEvent.change(nameInput, { target: { value: 'John Doe' } });
            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        test('clears errors when user starts typing', async () => {
            renderWithRouter(<AddCustomer />);
            
            const submitButton = screen.getByText('Add Customer');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Customer name is required')).toBeInTheDocument();
            });

            const nameInput = screen.getByPlaceholderText('Enter customer name');
            fireEvent.change(nameInput, { target: { value: 'John' } });

            await waitFor(() => {
                expect(screen.queryByText('Customer name is required')).not.toBeInTheDocument();
            });
        });
    });

    describe('CreateCheckout Form', () => {
        test('prevents submission with empty required fields', async () => {
            const mockAddCheckout = vi.fn();
            vi.mocked(require('../context/DataContext').useData).mockReturnValue({
                addCheckout: mockAddCheckout
            });

            renderWithRouter(<CreateCheckout />);
            
            const submitButton = screen.getByText('Create Checkout');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Checkout title is required')).toBeInTheDocument();
                expect(screen.getByText('Amount is required')).toBeInTheDocument();
            });

            expect(mockAddCheckout).not.toHaveBeenCalled();
        });

        test('validates amount is a positive number', async () => {
            renderWithRouter(<CreateCheckout />);
            
            const titleInput = screen.getByPlaceholderText('Enter checkout title');
            const amountInput = screen.getByPlaceholderText('0.00');
            const submitButton = screen.getByText('Create Checkout');

            fireEvent.change(titleInput, { target: { value: 'Test Checkout' } });
            fireEvent.change(amountInput, { target: { value: '-10' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid amount greater than 0')).toBeInTheDocument();
            });
        });
    });

    describe('PasswordSettings Form', () => {
        test('prevents submission with empty current password', async () => {
            render(<PasswordSettings />);
            
            const submitButton = screen.getByText('Update Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Current password is required')).toBeInTheDocument();
                expect(screen.getByText('New password is required')).toBeInTheDocument();
                expect(screen.getByText('Please confirm your new password')).toBeInTheDocument();
            });
        });

        test('validates password length and matching', async () => {
            render(<PasswordSettings />);
            
            const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
            const newPasswordInput = screen.getByPlaceholderText('Enter new password');
            const confirmPasswordInput = screen.getByPlaceholderText('Enter confirm new password');
            const submitButton = screen.getByText('Update Password');

            fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
            fireEvent.change(newPasswordInput, { target: { value: 'short' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
                expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
            });
        });
    });
});