'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, ExternalLink, Copy, Check, Instagram, Facebook, Twitter } from 'lucide-react'
import type { ContactInfo } from '@/lib/types'

interface ContactInfoCardProps {
  contact: ContactInfo
}

export function ContactInfoCard({ contact }: ContactInfoCardProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedItem(id)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'twitter':
        return <Twitter className="h-4 w-4" />
      default:
        return <ExternalLink className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            Contact Information
          </CardTitle>
          <Badge variant="success">Verified</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Emails */}
        {contact.emails.length > 0 && (
          <div>
            <h5 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email Addresses
            </h5>
            <div className="space-y-2">
              {contact.emails.map((email, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <code className="font-mono text-sm text-foreground">{email}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(email, `email-${index}`)}
                  >
                    {copiedItem === `email-${index}` ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phone Numbers */}
        {contact.phones.length > 0 && (
          <div>
            <h5 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Phone Numbers
            </h5>
            <div className="space-y-2">
              {contact.phones.map((phone, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <code className="font-mono text-sm text-foreground">{phone}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(phone, `phone-${index}`)}
                  >
                    {copiedItem === `phone-${index}` ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {contact.socialLinks.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-medium text-muted-foreground">
              Social Profiles
            </h5>
            <div className="flex flex-wrap gap-2">
              {contact.socialLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getSocialIcon(link.platform)}
                    {link.platform}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Source:</span> {contact.source}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
