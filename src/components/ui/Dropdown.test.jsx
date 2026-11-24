import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Dropdown from './Dropdown.jsx';

const OPTIONS = [
  { value: 'ADMIN', label: 'admin' },
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'MANAGERS', label: 'Managers' },
];

describe('Dropdown', () => {
  it('shows the placeholder, opens, and reports the chosen value', async () => {
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={onChange} placeholder="Select role" />);

    const toggle = screen.getByRole('button', { name: 'Select role' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('option', { name: 'Executive' }));

    expect(onChange).toHaveBeenCalledWith('EXECUTIVE');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters options with the search box', async () => {
    render(
      <Dropdown search options={OPTIONS} value="" onChange={() => {}} placeholder="Select role" />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Select role' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Search options' }), 'man');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Managers' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(<Dropdown options={OPTIONS} value="ADMIN" onChange={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'admin' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
