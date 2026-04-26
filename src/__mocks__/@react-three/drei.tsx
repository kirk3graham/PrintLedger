import React from 'react'

export const OrbitControls = () => null
export const Environment = () => null
export const Center = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const useGLTF = jest.fn(() => ({ scene: {} }))
export const Html = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const Stage = ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>
export const Loader = () => null
export const PerspectiveCamera = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const ContactShadows = () => null
export const Float = ({ children }: { children: React.ReactNode }) => <>{children}</>
