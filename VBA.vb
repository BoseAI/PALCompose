Private Sub Display_AnimationStart()
Dim targetPath As String
Dim command As String

' Cartella da servire
targetPath = "C:\Users\admin\Downloads\PalCompose"

' Costruzione del comando completo usando python dal PATH
command = "cd /d " & targetPath & " && python3 -m http.server 8000"
command = "cd /d " & targetPath & " && python -m http.server 8000"
command = "cd /d " & targetPath & " && py -m http.server 8000"

' Esecuzione del comando
Application.ExecuteCommand command
End Sub