<div className="flex flex-col items-center justify-center p-4 bg-white shadow rounded-lg">
  <h2 className="text-xl font-bold">{nome} {cognome}</h2>
  <div className="w-24 h-24 rounded-full overflow-hidden">
    {photo ? <img src={photo} alt="Profile" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center text-xl font-bold bg-gray-300 rounded-full">{initials}</div>}
  </div>
  <button className="mt-4 p-2 bg-blue-500 text-white rounded" onClick={takePhoto} capture="environment">
    Take Photo
  </button>
</div>