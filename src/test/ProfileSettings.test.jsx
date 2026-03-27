import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProfileSettings from '../pages/settings/ProfileSettings';
import { STORAGE_PREFIX } from '../config/env';

// #34: empty state should appear when the user has no profile data yet.

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;

function seedSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: { isAuthenticated: true, walletAddress: null, walletType: null, ...user },
        expiresAt: Date.now() + 999_999,
    }));
}

function renderProfileSettings() {
    return render(
        <AuthProvider>
            <MemoryRouter>
                <ProfileSettings />
            </MemoryRouter>
        </AuthProvider>
    );
}

beforeEach(() => localStorage.clear());

describe('ProfileSettings — empty state (Issue #34)', () => {
    it('shows the empty state when name and email are both absent', () => {
        seedSession({ id: '0xabc', name: '', email: '' });
        renderProfileSettings();
        expect(screen.getByText('No profile information yet')).toBeTruthy();
    });

    it('shows the empty state description', () => {
        seedSession({ id: '0xabc', name: '', email: '' });
        renderProfileSettings();
        expect(screen.getByText('Fill in your details below to complete your profile.')).toBeTruthy();
    });

    it('shows the empty state when name is present but email is absent', () => {
        seedSession({ id: '1', name: 'Emma', email: '' });
        renderProfileSettings();
        expect(screen.getByText('No profile information yet')).toBeTruthy();
    });

    it('hides the empty state when email is present', () => {
        seedSession({ id: '1', name: '', email: 'emma@example.com' });
        renderProfileSettings();
        expect(screen.queryByText('No profile information yet')).toBeNull();
    });

    it('hides the empty state when both name and email are present', () => {
        seedSession({ id: '1', name: 'Emma', email: 'emma@example.com' });
        renderProfileSettings();
        expect(screen.queryByText('No profile information yet')).toBeNull();
    });
});

describe('ProfileSettings — form always present', () => {
    it('renders the form even when the empty state is visible', () => {
        seedSession({ id: '0xabc', name: '', email: '' });
        renderProfileSettings();
        expect(screen.getByText('Save Changes')).toBeTruthy();
    });

    it('renders the form when the user has a full profile', () => {
        seedSession({ id: '1', name: 'Emma', email: 'emma@example.com' });
        renderProfileSettings();
        expect(screen.getByText('Save Changes')).toBeTruthy();
    });
});

describe('ProfileSettings — form validation', () => {
    it('shows error when name is empty on submit', async () => {
        seedSession({ id: '1', name: '', email: 'emma@example.com' });
        await act(async () => { renderProfileSettings(); });
        await act(async () => { fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')); });
        expect(screen.getByText('Full name is required.')).toBeTruthy();
    });

    it('shows error when email is empty on submit', async () => {
        seedSession({ id: '1', name: 'Emma', email: '' });
        await act(async () => { renderProfileSettings(); });
        await act(async () => { fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')); });
        expect(screen.getByText('Email is required.')).toBeTruthy();
    });
});
