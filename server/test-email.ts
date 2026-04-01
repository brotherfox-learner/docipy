import { Resend } from 'resend';

const resend = new Resend('re_QcDR8KKt_5n66w8ApXpJCqiCvsYXHs9n8');

async function testEmail() {
  console.log('Sending test email...');
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'docipyai@gmail.com',
    subject: 'Hello from Docipy backend test!',
    html: '<p>Congrats on sending your <strong>first email</strong> via testing script!</p>'
  });

  if (error) {
    console.error('RESEND ERROR:', error);
  } else {
    console.log('SUCCESS! Email sent id:', data);
  }
}

testEmail();
