'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  size?: 'default' | 'large'
  placeholder?: string
  className?: string
}

export function SearchInput({ 
  size = 'default', 
  placeholder = 'https://www.airbnb.com/rooms/...',
  className 
}: SearchInputProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setError('Please enter an Airbnb listing URL')
      return false
    }
    
    try {
      const urlObj = new URL(input)
      if (!urlObj.hostname.includes('airbnb')) {
        setError('Please enter a valid Airbnb URL')
        return false
      }
      return true
    } catch {
      setError('Please enter a valid URL')
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateUrl(url)) return
    
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Extract listing ID from URL and navigate to results
    const listingId = url.match(/rooms\/(\d+)/)?.[1] || 'demo'
    router.push(`/search?listing_id=${listingId}`)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className={cn(
        'relative flex items-center gap-2 rounded-lg border border-border bg-card p-2 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
        size === 'large' && 'p-3'
      )}>
        <Search className={cn(
          'text-muted-foreground',
          size === 'large' ? 'h-6 w-6 ml-2' : 'h-5 w-5 ml-1'
        )} />
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          placeholder={placeholder}
          className={cn(
            'flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
            size === 'large' ? 'text-lg px-2' : 'text-base px-1'
          )}
        />
        <Button 
          type="submit" 
          disabled={isLoading}
          size={size === 'large' ? 'lg' : 'default'}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Analyzing...</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Analyze</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </form>
  )
}
