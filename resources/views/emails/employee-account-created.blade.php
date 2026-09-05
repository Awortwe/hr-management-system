<p>Hello {{ $user->name }},</p>

<p>Your PeopleHQ account has been created.</p>

<table cellpadding="6" cellspacing="0" role="presentation">
    <tr>
        <td><strong>Email</strong></td>
        <td>{{ $user->email }}</td>
    </tr>
    <tr>
        <td><strong>Password</strong></td>
        <td>{{ $plainPassword }}</td>
    </tr>
    <tr>
        <td><strong>Role</strong></td>
        <td>{{ strtoupper($user->role) }}</td>
    </tr>
</table>

<p>Please sign in and keep these details private.</p>
