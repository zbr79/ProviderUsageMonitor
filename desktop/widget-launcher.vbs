Set fso = CreateObject("Scripting.FileSystemObject")
Set ws = CreateObject("Wscript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.Run "cmd /c cd /d """ & dir & """ && npm start", 0, False
