'use client';
import { registerComponent } from '@plasmicapp/host';
import Dr16 from './components/Dr16';

registerComponent(Dr16, {
  name: 'Dr16',
  props: {
    panelHue: {
      type: 'string',
      defaultValue: '#2b2b2b',
      description: 'Base panel hue (dark metal)'
    },
    woodPreset: {
      type: 'choice',
      options: ['walnut','rosewood','oak','ebony'],
      defaultValue: 'walnut',
      description: 'Wood frame preset'
    },
    iconSize: {
      type: 'number',
      defaultValue: 12,
      description: 'Instrument icon size (px)'
    },
    padSize: {
      type: 'choice',
      options: ['sm','md','lg'],
      defaultValue: 'md',
      description: 'Step pad height preset'
    },
    showMeasureLines: {
      type: 'boolean',
      defaultValue: true,
      description: 'Show the faint line every 4 steps'
    }
  }
});
