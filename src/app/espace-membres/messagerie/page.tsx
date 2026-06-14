export default function MessageriePage() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8">
      <div className="text-5xl mb-4">💬</div>
      <h2 className="font-serif text-xl font-bold text-arc-navy mb-2">Messagerie interne</h2>
      <p className="text-sm text-arc-text2 max-w-xs">
        Sélectionne une conversation à gauche ou clique <strong>+</strong> pour envoyer un nouveau message.
      </p>
    </div>
  );
}
