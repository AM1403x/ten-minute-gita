import React from 'react';
import { Image } from 'react-native';

const googleLogo = require('../../assets/images/google-g.png');

interface GoogleIconProps {
  size?: number;
}

export function GoogleIcon({ size = 20 }: GoogleIconProps) {
  return (
    <Image
      source={googleLogo}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
