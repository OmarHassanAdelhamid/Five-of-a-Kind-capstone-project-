/**
 * Tests for the STL model selector control.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/04
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelector } from './ModelSelector';

describe('ModelSelector', () => {
  it('renders options for each model', () => {
    const { getByRole, getByText } = render(
      <ModelSelector
        models={['a.stl', 'b.stl']}
        selectedModel="a.stl"
        onModelChange={jest.fn()}
      />,
    );
    expect(getByRole('combobox')).toHaveValue('a.stl');
    expect(getByText('a.stl')).toBeInTheDocument();
    expect(getByText('b.stl')).toBeInTheDocument();
  });

  it('calls onModelChange when selection changes', async () => {
    const onModelChange = jest.fn();
    const { getByRole } = render(
      <ModelSelector
        models={['a.stl', 'b.stl']}
        selectedModel="a.stl"
        onModelChange={onModelChange}
      />,
    );
    await userEvent.selectOptions(getByRole('combobox'), 'b.stl');
    expect(onModelChange).toHaveBeenCalledWith('b.stl');
  });

  it('shows No models available when empty', () => {
    const { getByText } = render(
      <ModelSelector
        models={[]}
        selectedModel={null}
        onModelChange={jest.fn()}
      />,
    );
    expect(getByText('No models available')).toBeInTheDocument();
  });

  it('select is disabled when disabled prop is true', () => {
    const { getByRole } = render(
      <ModelSelector
        models={['a.stl']}
        selectedModel="a.stl"
        onModelChange={jest.fn()}
        disabled
      />,
    );
    expect(getByRole('combobox')).toBeDisabled();
  });
});
