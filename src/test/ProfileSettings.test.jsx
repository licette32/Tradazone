import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

let mockUser;
const mockUpdateProfile = vi.fn();

vi.mock('../context/AuthContext', () => ({
    useAuthUser: () => mockUser,
    useAuthActions: () => ({ updateProfile: mockUpdateProfile }),
}));

vi.mock('../components/ui/StagingBanner', () => ({
    default: () => null,
}));

async function renderProfileSettings() {
    const { default: ProfileSettings } = await import('../pages/settings/ProfileSettings');
    render(<ProfileSettings />);
}

describe('ProfileSettings', () => {
    beforeEach(() => {
        mockUpdateProfile.mockReset();
        mockUser = {
            name: 'Alice Merchant',
            email: 'alice@example.com',
            phone: '1234567890',
            company: 'Alice Co',
            address: '42 Chain Street',
            profileDescription: '<p>Existing <strong>profile</strong></p>',
        };
    });

    it('renders the saved rich text description from auth state', async () => {
        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        expect(editor.innerHTML).toContain('Existing');
        expect(editor.innerHTML).toContain('<strong>profile</strong>');
    });

    it('saves rich text description updates through AuthContext', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        editor.innerHTML = '<p>Updated <em>merchant</em> summary</p>';
        fireEvent.input(editor);

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).toHaveBeenCalledWith({
            name: 'Alice Merchant',
            email: 'alice@example.com',
            phone: '1234567890',
            company: 'Alice Co',
            address: '42 Chain Street',
            profileDescription: '<p>Updated <em>merchant</em> summary</p>',
        });
        expect(screen.getByRole('status')).toHaveTextContent('Profile saved for this session.');
    });
});
