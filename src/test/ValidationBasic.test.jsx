/**
 * Basic validation test to verify our fixes work
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddCustomer from '../pages/customers/AddCustomer';

// Mock the context providers
vi.mock('../context/DataContext', () => ({
    useData: () => ({
        addCustomer: vi.fn()
    })
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Basic Validation Test', () => {
    test('AddCustomer shows validation errors', () => {
        const mockAddCustomer = vi.fn();
        vi.mocked(require('../context/DataContext').useData).mockReturnValue({
            addCustomer: mockAddCustomer
        });

        renderWithRouter(<AddCustomer />);
        
        // Find and click submit button
        const submitButton = screen.getByRole('button', { name: /add customer/i });
        fireEvent.click(submitButton);

        // Check if validation errors appear
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
        expect(screen.getByText('Email address is required')).toBeInTheDocument();

        // Verify addCustomer was not called
        expect(mockAddCustomer).not.toHaveBeenCalled();
    });
});