import { MatchFieldRule } from '../../utils/validators/MatchFieldRule';
import VGSCollect from '../../collector/VGSCollect';

/**
 * Minimal mock registration using real VGSCollect to ensure integration path works.
 */
describe('MatchFieldRule', () => {
  let collector: VGSCollect;
  beforeEach(() => {
    collector = new VGSCollect('testvault', 'sandbox');
    // Register primary field
    collector.registerField(
      'primary',
      () => 'secret-value',
      () => [],
      undefined,
      'text',
      []
    );
  });

  it('validates when input matches other field value', () => {
    const rule = new MatchFieldRule(collector, 'primary', 'Values mismatch');
    expect(rule.validate('secret-value')).toBe(true);
  });

  it('invalidates when input differs', () => {
    const rule = new MatchFieldRule(collector, 'primary', 'Values mismatch');
    expect(rule.validate('different')).toBe(false);
  });

  it('invalidates when other field missing', () => {
    const rule = new MatchFieldRule(collector, 'missing', 'Values mismatch');
    expect(rule.validate('anything')).toBe(false);
  });

  it('invalidates empty input', () => {
    const rule = new MatchFieldRule(collector, 'primary', 'Values mismatch');
    expect(rule.validate('')).toBe(false);
  });
});