type CasAuthButtonProps = {
  mode: 'login' | 'logout'
  onClick: () => void
  disabled?: boolean
  className?: string
}

function CasAuthButton({ mode, onClick, disabled = false, className }: CasAuthButtonProps) {
  const label = mode === 'login' ? 'Login with VT CAS' : 'Log out'

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {label}
    </button>
  )
}

export default CasAuthButton
