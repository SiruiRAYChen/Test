import emailjs from '@emailjs/browser';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addConsultationRequest } from '../api/consultationService.js';
import Form from './NewForm.jsx';

vi.mock('react-google-recaptcha', () => ({
  default: React.forwardRef((props, ref) => {
    if (ref && typeof ref === 'function') {
      ref({ reset: vi.fn(), getValue: () => 'mock-recaptcha-token' });
    } else if (ref) {
      ref.current = { reset: vi.fn(), getValue: () => 'mock-recaptcha-token' };
    }
    return (
      <div
        data-testid="mock-recaptcha"
        onClick={() => props.onChange('mock-recaptcha-token')}
      >
        Mock ReCAPTCHA
      </div>
    );
  })
}));

vi.mock('./LocationAutocomplete.jsx', () => ({
  default: ({ onPlaceSelected, value }) => (
    <button
      data-testid="mock-location-autocomplete"
      onClick={() =>
        onPlaceSelected({ description: 'Test Location', place_id: 'test_place_id' })
      }
    >
      Select Location (Selected: {value ? value.description : 'None'})
    </button>
  )
}));

vi.mock('./MultiSelectDropdown.jsx', () => ({
  default: props => (
    <button
      data-testid={`mock-multiselect-${props.name}-button`}
      onClick={() => {
        props.onChange({ target: { name: props.name, value: ['Test Topic 1'] } });
      }}
    >
      Select {props.label} (Selected:{' '}
      {Array.isArray(props.value) ? props.value.join(', ') : ''})
    </button>
  )
}));

vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn().mockResolvedValue({ status: 200, text: 'OK' })
  }
}));

vi.mock('../api/consultationService.js', () => ({
  addConsultationRequest: vi
    .fn()
    .mockResolvedValue({ success: true, id: 'mock-consultation-id' })
}));

describe('NewForm Component Simplified Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillStep1Form = async (options = {}) => {
    const {
      name = 'Test User',
      email = 'test@example.com',
      location = true,
      stage = 'Just getting started'
    } = options;

    if (name) {
      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: name }
      });
    }

    if (email) {
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: email }
      });
    }

    if (location) {
      fireEvent.click(screen.getByTestId('mock-location-autocomplete'));
    }

    if (stage) {
      fireEvent.mouseDown(
        screen.getByLabelText(/Stage of Reparations Initiative/i)
      );
      const option = await screen.findByRole('option', {
        name: new RegExp(stage, 'i')
      });
      fireEvent.click(option);
    }
  };

  it('advances through steps when all fields are valid', async () => {
    render(<Form />);
    expect(
      screen.getByText('Requesting Consultation from FirstRepair')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
      expect(screen.getByText('Step 2/4')).toBeInTheDocument();
    });

    await fillStep1Form();

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About Your Question')).toBeInTheDocument();
      expect(screen.getByText('Step 3/4')).toBeInTheDocument();
    });
  });

  it('shows an error when Name is missing', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form({ name: '' });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(screen.getByText('About You')).toBeInTheDocument();
  });

  it('shows an error when Email is invalid', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form({ email: 'invalid-email' });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('About You')).toBeInTheDocument();
  });

  it('shows an error when Email is missing', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form({ email: '' });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    expect(screen.getByText('About You')).toBeInTheDocument();
  });

  it('shows an error when Location is missing', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form({ location: false });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('Location is required')).toBeInTheDocument();
    });
    expect(screen.getByText('About You')).toBeInTheDocument();
  });

  it('shows an error when Stage is missing', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form({ stage: null });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Please select a stage of reparations initiative')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('About You')).toBeInTheDocument();
  });

  it('shows an error when Topics are missing on submission', async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About You')).toBeInTheDocument();
    });

    await fillStep1Form();
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    await waitFor(() => {
      expect(screen.getByText('About Your Question')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Additional Context/i), {
      target: { value: 'Some context.' }
    });
    fireEvent.click(screen.getByTestId('mock-recaptcha'));
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Please fill in all required fields: Name, Email, Location, Stage, and at least one Topic.'
        )
      ).toBeInTheDocument();
    });
    expect(screen.getByText('About Your Question')).toBeInTheDocument();
    expect(addConsultationRequest).not.toHaveBeenCalled();
  });
});
