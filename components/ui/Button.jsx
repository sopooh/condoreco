export default function Button({ variant = 'primary', block, children, ...props }) {
  const cls = `btn btn-${variant}${block ? ' btn-block' : ''}`
  return <button className={cls} {...props}>{children}</button>
}
