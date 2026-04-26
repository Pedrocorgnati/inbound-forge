'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SourceForm } from './SourceForm'

export function SourceAddButton() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Button onClick={() => setShowForm(true)} data-testid="source-add-button">
        <Plus className="h-4 w-4" aria-hidden />
        Nova fonte
      </Button>

      {showForm && (
        <SourceForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
