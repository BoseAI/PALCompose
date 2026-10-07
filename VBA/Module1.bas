Attribute VB_Name = "Module1"
Option Explicit

#If VBA7 Then
    Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
    Private Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If

' ====== Attesa che non occupa la CPU ======
' La versione precedente girava a vuoto con DoEvents e teneva un core al 100%
' per tutto il tempo in cui l'operatore lavorava nella pagina.
Public Sub WaitMs(ByVal I_dTimeToWait As Double)
    Dim Timer0 As Double
    Dim ElapsedTime As Double
    Timer0 = Timer
    Do
        DoEvents
        Sleep 50
        ElapsedTime = Timer - Timer0
        If ElapsedTime < 0 Then ElapsedTime = ElapsedTime + 86400
    Loop Until ElapsedTime >= I_dTimeToWait / 1000
End Sub

' ====== Numero -> testo con il punto decimale ======
' Le funzioni di testo sono scritte come VBA.Left$ ecc.: nel VBA di FactoryTalk il nome Left
' e' anche una proprieta' degli oggetti grafici e senza il prefisso VBA. il compilatore si confonde.
' CStr usa le impostazioni internazionali di Windows: in italiano 12.5 diventa "12,5"
' e il JSON letto dalla pagina non e' piu' valido. Str$ usa sempre il punto.
Public Function NumToText(ByVal v As Variant) As String
    Dim s As String
    s = VBA.Trim$(VBA.Str$(v))
    If VBA.Left$(s, 1) = "." Then s = "0" & s
    If VBA.Left$(s, 2) = "-." Then s = "-0" & VBA.Mid$(s, 2)
    NumToText = s
End Function

' ====== Testo -> numero con il punto decimale ======
' CDbl("12.5") con impostazioni italiane restituisce 125. Val usa sempre il punto.
Public Function TextToNum(ByVal s As Variant) As Double
    TextToNum = VBA.Val(VBA.Trim$(VBA.CStr(s)))
End Function
