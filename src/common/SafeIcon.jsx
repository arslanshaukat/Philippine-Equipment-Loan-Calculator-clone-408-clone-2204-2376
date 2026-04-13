import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const SafeIcon = ({ icon, className, ...props }) => {
  /* 
    If a direct icon component is passed, render it.
    Otherwise, fall back to a generic alert icon to prevent crashes.
  */
  if (icon) {
    return React.createElement(icon, { className, ...props });
  }
  
  return <FiAlertTriangle className={className} {...props} />;
};

export default SafeIcon;