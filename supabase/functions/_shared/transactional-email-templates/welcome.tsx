/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  siteUrl?: string
}

const Email = ({ firstName, siteUrl = 'https://www.dicadecor.fr' }: Props) => (
  <Html lang="fr">
    <Head />
    <Preview>Bienvenue sur dicadecor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bienvenue{firstName ? ` ${firstName}` : ''} 👋</Heading>
        <Text style={text}>
          Merci d'avoir rejoint dicadecor. Vous pouvez dès à présent créer vos
          projets et visualiser vos décors sur vos photos.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={siteUrl} style={button}>
            Ouvrir mon espace
          </Button>
        </Section>
        <Text style={muted}>
          Une question ? Répondez simplement à cet email, notre équipe vous
          répondra.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Bienvenue sur dicadecor',
  displayName: 'Bienvenue',
  previewData: { firstName: 'Alex' },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
}
const container: React.CSSProperties = {
  padding: '32px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}
const h1: React.CSSProperties = { color: '#0a0a0a', fontSize: '24px', margin: '0 0 16px' }
const text: React.CSSProperties = { color: '#3f3f46', fontSize: '15px', lineHeight: '24px' }
const muted: React.CSSProperties = { color: '#71717a', fontSize: '13px', marginTop: '24px' }
const button: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
}
