        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <ThemePageContent />
        </Suspense>
    );
}
