import React from 'react';
import { AppBar } from 'react-admin';
import MyUserMenu from './MyUserMenu';

const MyAppbar = props => <AppBar {...props} userMenu={<MyUserMenu />} />;
export default MyAppbar;
