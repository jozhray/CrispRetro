import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Column from '../Column'; // Adjust path if needed
import React from 'react';

// Mock Lucide icons with a Proxy to handle any icon import
vi.mock('lucide-react', () => {
    return new Proxy({}, {
        get: (target, prop) => {
            // Return a simple component for any icon import
            return () => <span data-testid={`icon-${String(prop).toLowerCase()}`} />;
        }
    });
});

// Mock framer-motion components
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }) => <>{children}</>,
    Reorder: {
        Group: ({ children }) => <div>{children}</div>,
        Item: ({ children }) => <div>{children}</div>
    },
    useDragControls: () => ({ start: vi.fn() })
}));

// Mock NoteCard component
vi.mock('../NoteCard', () => ({
    default: () => <div data-testid="note-card" />
}));

describe('Column Component - Inline Editing', () => {
    const mockOnUpdateColumn = vi.fn();
    const defaultProps = {
        column: {
            id: 'col1',
            title: 'Test Column',
            color: 'bg-slate-50',
            titleColor: 'text-slate-900',
            order: 0
        },
        notes: [],
        onUpdateColumn: mockOnUpdateColumn,
        isAdmin: true, // Default to admin for editing tests
        currentUser: 'Test User',
        currentUserId: 'user1',
        // Add other required props with no-ops
        onAddNote: vi.fn(),
        onUpdateNote: vi.fn(),
        onUpdateNoteColor: vi.fn(),
        onDeleteNote: vi.fn(),
        onVoteNote: vi.fn(),
        onReactNote: vi.fn(),
        onMoveNote: vi.fn(),
        onReorderNotes: vi.fn(),
        onAddComment: vi.fn(),
        onUpdateComment: vi.fn(),
        onDeleteComment: vi.fn(),
        onDeleteColumn: vi.fn(),
        searchQuery: '',
        onDragStart: vi.fn(),
        onDragEnd: vi.fn()
    };

    it('renders column title correctly', () => {
        render(<Column {...defaultProps} />);
        expect(screen.getByText('Test Column')).toBeInTheDocument();
    });

    it('enters edit mode when admin clicks title', () => {
        render(<Column {...defaultProps} />);
        const title = screen.getByText('Test Column');
        fireEvent.click(title);

        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('Test Column');
    });

    it('does not enter edit mode when non-admin clicks title', () => {
        render(<Column {...defaultProps} isAdmin={false} />);
        const title = screen.getByText('Test Column');
        fireEvent.click(title);

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('saves changes on input blur', async () => {
        render(<Column {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByText('Test Column'));

        // Change text
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Updated Column' } });

        // Blur
        fireEvent.blur(input);

        // Wait for the timeout (200ms) to complete
        await waitFor(() => {
            expect(mockOnUpdateColumn).toHaveBeenCalledWith('col1', { title: 'Updated Column' });
        });
    });

    it('saves changes on Enter key', () => {
        render(<Column {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByText('Test Column'));

        // Change text
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Updated Column' } });

        // Press Enter
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnUpdateColumn).toHaveBeenCalledWith('col1', { title: 'Updated Column' });
    });

    it('cancels changes on Escape key', () => {
        render(<Column {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByText('Test Column'));

        // Change text
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Updated Column' } });

        // Press Escape
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

        // Should revert to view mode with original text
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Test Column')).toBeInTheDocument();
        expect(mockOnUpdateColumn).not.toHaveBeenCalled();
    });

    it('cancels changes when Cancel button is clicked', () => {
        render(<Column {...defaultProps} />);

        // Enter edit mode
        fireEvent.click(screen.getByText('Test Column'));

        // Change text
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Updated Column' } });

        // Click Cancel button (find by title or icon mock)
        const cancelButton = screen.getByTitle('Cancel');
        fireEvent.click(cancelButton);

        // Should revert to view mode with original text
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Test Column')).toBeInTheDocument();
        expect(mockOnUpdateColumn).not.toHaveBeenCalled();
    });

    it('saves changes when Save button is clicked', () => {
        render(<Column {...defaultProps} />);

        fireEvent.click(screen.getByText('Test Column'));
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Saved Button' } });

        const saveButton = screen.getByTitle('Save changes');
        fireEvent.click(saveButton);

        expect(mockOnUpdateColumn).toHaveBeenCalledWith('col1', { title: 'Saved Button' });
    });
});
