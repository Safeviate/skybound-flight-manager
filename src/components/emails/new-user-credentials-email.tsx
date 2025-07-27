
import * as React from 'react';

interface NewUserCredentialsEmailProps {
  userName: string;
  companyName: string;
  loginUrl: string;
  userEmail: string;
  temporaryPassword?: string;
}

export const NewUserCredentialsEmail: React.FC<Readonly<NewUserCredentialsEmailProps>> = ({
  userName,
  companyName,
  loginUrl,
  userEmail,
  temporaryPassword,
}) => (
  <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: '20px', backgroundColor: '#f4f4f4', color: '#333' }}>
    <h1 style={{ color: '#2563eb', fontSize: '24px' }}>Welcome to {companyName}</h1>
    <p style={{ fontSize: '16px', lineHeight: '1.5' }}>Hello {userName},</p>
    <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
      An account has been created for you in the {companyName} portal. You can use the following credentials to log in and access the system.
    </p>
    <div style={{ border: '1px solid #ddd', padding: '10px 20px', margin: '20px 0', backgroundColor: '#fff', borderRadius: '5px' }}>
      <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '10px 0' }}><strong>Email:</strong> {userEmail}</p>
      {temporaryPassword && <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '10px 0' }}><strong>Temporary Password:</strong> {temporaryPassword}</p>}
    </div>
    <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
      For security reasons, you will be required to change your temporary password upon your first login.
    </p>
    <a href={loginUrl} target="_blank" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', textDecoration: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold' }}>
      Login to Your Account
    </a>
    <p style={{ marginTop: '30px', fontSize: '12px', color: '#777' }}>
      If you have any questions, please contact your system administrator.
    </p>
  </div>
);

export default NewUserCredentialsEmail;
