
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
  <div style={container}>
    <h1 style={h1}>Welcome to {companyName}</h1>
    <p style={p}>Hello {userName},</p>
    <p style={p}>
      An account has been created for you in the {companyName} portal. You can use the following credentials to log in and access the system.
    </p>
    <div style={box}>
      <p style={credential}><strong>Email:</strong> {userEmail}</p>
      {temporaryPassword && <p style={credential}><strong>Temporary Password:</strong> {temporaryPassword}</p>}
    </div>
    <p style={p}>
      For security reasons, you will be required to change your temporary password upon your first login.
    </p>
    <a href={loginUrl} target="_blank" style={button}>
      Login to Your Account
    </a>
    <p style={footer}>
      If you have any questions, please contact your system administrator.
    </p>
  </div>
);

export default NewUserCredentialsEmail;

// Styles
const container: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  padding: '20px',
  backgroundColor: '#f4f4f4',
  color: '#333',
};

const h1: React.CSSProperties = {
  color: '#2563eb',
  fontSize: '24px',
};

const p: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.5',
};

const box: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '10px 20px',
  margin: '20px 0',
  backgroundColor: '#fff',
  borderRadius: '5px',
};

const credential: React.CSSProperties = {
  ...p,
  margin: '10px 0',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  fontWeight: 'bold',
};

const footer: React.CSSProperties = {
  marginTop: '30px',
  fontSize: '12px',
  color: '#777',
};
