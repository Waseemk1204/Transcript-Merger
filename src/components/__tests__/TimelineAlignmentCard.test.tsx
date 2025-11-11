import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimelineAlignmentCard } from '../TimelineAlignmentCard';

describe('TimelineAlignmentCard', () => {
  const mockSecondaryFiles = [
    { id: 'vid1', name: 'Vid1.srt', currentOffsetMs: 0 },
    { id: 'vid2', name: 'Vid2.srt', currentOffsetMs: 900000 } // 15 minutes
  ];

  const defaultProps = {
    primaryEnd: '00:30:00,000',
    secondaryFiles: mockSecondaryFiles
  };

  it('should render primary timeline end correctly', () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    expect(screen.getByText('Timeline Alignment')).toBeInTheDocument();
    expect(screen.getByText('Primary timeline end')).toBeInTheDocument();
    // Check for primary end timestamp - it should appear in a large bold text
    const timestampElements = screen.getAllByText('00:30:00,000');
    expect(timestampElements.length).toBeGreaterThan(0);
    // Verify the helper text
    expect(screen.getByText('Other transcripts will be shifted to continue after this time')).toBeInTheDocument();
  });

  it('should render secondary files with current and applied offsets', () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    expect(screen.getByText('Vid1.srt')).toBeInTheDocument();
    expect(screen.getByText('Vid2.srt')).toBeInTheDocument();
    // Check that offset labels exist (may appear multiple times, so use getAllByText)
    expect(screen.getAllByText('Current offset:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Applied offset:').length).toBeGreaterThan(0);
  });

  it('should default to auto mode and show primary end as applied offset', () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    const autoRadio = screen.getByLabelText('Auto-shift by primary end') as HTMLInputElement;
    expect(autoRadio).toBeChecked();
    
    // Check that applied offsets show primary end (30 minutes = 1800000 ms)
    const appliedOffsets = screen.getAllByText('00:30:00,000');
    expect(appliedOffsets.length).toBeGreaterThan(0);
  });

  it('should compute offsets correctly in auto mode', () => {
    const onChange = vi.fn();
    render(<TimelineAlignmentCard {...defaultProps} onChange={onChange} />);
    
    expect(onChange).toHaveBeenCalled();
    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.mode).toBe('auto');
    expect(lastCall.computedOffsets).toHaveLength(2);
    expect(lastCall.computedOffsets[0].offsetMs).toBe(1800000); // 30 minutes
    expect(lastCall.computedOffsets[1].offsetMs).toBe(1800000);
  });

  it('should compute offsets correctly in none mode', async () => {
    const onChange = vi.fn();
    render(<TimelineAlignmentCard {...defaultProps} onChange={onChange} />);
    
    const noneRadio = screen.getByLabelText('No shift') as HTMLInputElement;
    fireEvent.click(noneRadio);
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const calls = onChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.mode).toBe('none');
      expect(lastCall.computedOffsets[0].offsetMs).toBe(0);
      expect(lastCall.computedOffsets[1].offsetMs).toBe(900000); // 15 minutes
    });
  });

  it('should show custom offset input when custom mode is selected', () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    const customRadio = screen.getByLabelText('Custom offset') as HTMLInputElement;
    fireEvent.click(customRadio);
    
    const customInput = screen.getByLabelText('Custom offset:') as HTMLInputElement;
    expect(customInput).toBeInTheDocument();
  });

  it('should compute offsets correctly in custom mode', async () => {
    const onChange = vi.fn();
    render(<TimelineAlignmentCard {...defaultProps} onChange={onChange} />);
    
    const customRadio = screen.getByLabelText('Custom offset') as HTMLInputElement;
    fireEvent.click(customRadio);
    
    const customInput = screen.getByLabelText('Custom offset:') as HTMLInputElement;
    fireEvent.change(customInput, { target: { value: '00:15:00,000' } });
    
    await waitFor(() => {
      const calls = onChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.mode).toBe('custom');
      expect(lastCall.customOffset).toBe('00:15:00,000');
      expect(lastCall.computedOffsets[0].offsetMs).toBe(900000); // 15 minutes
    });
  });

  it('should validate custom offset input and show error for invalid format', async () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    const customRadio = screen.getByLabelText('Custom offset') as HTMLInputElement;
    fireEvent.click(customRadio);
    
    const customInput = screen.getByLabelText('Custom offset:') as HTMLInputElement;
    fireEvent.change(customInput, { target: { value: 'invalid' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid timestamp format/)).toBeInTheDocument();
    });
  });

  it('should accept custom offset with dot separator', async () => {
    const onChange = vi.fn();
    render(<TimelineAlignmentCard {...defaultProps} onChange={onChange} />);
    
    const customRadio = screen.getByLabelText('Custom offset') as HTMLInputElement;
    fireEvent.click(customRadio);
    
    const customInput = screen.getByLabelText('Custom offset:') as HTMLInputElement;
    fireEvent.change(customInput, { target: { value: '00:15:00.500' } });
    
    await waitFor(() => {
      const calls = onChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.computedOffsets[0].offsetMs).toBe(900500); // 15 minutes 500ms
    });
  });

  it('should call onChange when Apply preview is clicked', () => {
    const onChange = vi.fn();
    render(<TimelineAlignmentCard {...defaultProps} onChange={onChange} />);
    
    onChange.mockClear();
    
    const applyButton = screen.getByText('Apply preview');
    fireEvent.click(applyButton);
    
    expect(onChange).toHaveBeenCalledTimes(1);
    const calls = onChange.mock.calls;
    const payload = calls[0][0];
    expect(payload.mode).toBe('auto');
    expect(payload.computedOffsets).toHaveLength(2);
  });

  it('should reset to defaults when Reset is clicked', async () => {
    const onChange = vi.fn();
    render(
      <TimelineAlignmentCard
        {...defaultProps}
        defaultMode="custom"
        defaultCustomOffset="00:10:00,000"
        onChange={onChange}
      />
    );
    
    // Change mode
    const noneRadio = screen.getByLabelText('No shift') as HTMLInputElement;
    fireEvent.click(noneRadio);
    
    // Change custom offset
    const customRadio = screen.getByLabelText('Custom offset') as HTMLInputElement;
    fireEvent.click(customRadio);
    const customInput = screen.getByLabelText('Custom offset:') as HTMLInputElement;
    fireEvent.change(customInput, { target: { value: '00:20:00,000' } });
    
    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(customRadio).toBeChecked();
      expect(customInput.value).toBe('00:10:00,000');
    });
  });

  it('should handle files without currentOffsetMs', () => {
    const filesWithoutOffset = [
      { id: 'vid1', name: 'Vid1.srt' }
    ];
    
    const onChange = vi.fn();
    render(
      <TimelineAlignmentCard
        primaryEnd="00:30:00,000"
        secondaryFiles={filesWithoutOffset}
        onChange={onChange}
      />
    );
    
    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.computedOffsets[0].offsetMs).toBe(1800000); // auto mode uses primary end
  });

  it('should be keyboard accessible', () => {
    render(<TimelineAlignmentCard {...defaultProps} />);
    
    const autoRadio = screen.getByLabelText('Auto-shift by primary end') as HTMLInputElement;
    autoRadio.focus();
    expect(document.activeElement).toBe(autoRadio);
    
    // Tab navigation should work
    fireEvent.keyDown(autoRadio, { key: 'Tab' });
  });

  it('should display correct current offset for each file', () => {
    const files = [
      { id: 'vid1', name: 'Vid1.srt', currentOffsetMs: 0 },
      { id: 'vid2', name: 'Vid2.srt', currentOffsetMs: 900000 }
    ];
    
    render(
      <TimelineAlignmentCard
        primaryEnd="00:30:00,000"
        secondaryFiles={files}
      />
    );
    
    // Check that current offsets are displayed
    expect(screen.getByText('00:00:00,000')).toBeInTheDocument();
    expect(screen.getByText('00:15:00,000')).toBeInTheDocument();
  });
});

